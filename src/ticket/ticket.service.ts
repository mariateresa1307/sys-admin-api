import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { ObjectId } from 'mongodb';
import { TicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TICKET_STATUS } from 'src/utils/constants/tickets';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';
import { Request } from 'express';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { Miscellaneous } from '../miscellaneous/entities/miscellaneous.entity';
import { Service } from '../service/entities/service.entity';
import { getClientIp } from '../utils/constants/get-client-ip';
import { UserSessionsService } from '../userSessions/userSessions.service';
import { NotificationsService } from '../notifications/notifications.service';
@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: MongoRepository<Ticket>,
    private readonly usersService: UsersService,
    private readonly userSessionsService: UserSessionsService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: MongoRepository<AuditLog>,
    @InjectRepository(Miscellaneous)
    private readonly miscellaneousRepository: MongoRepository<Miscellaneous>,
    @InjectRepository(Service)
    private readonly serviceRepository: MongoRepository<Service>,
  ) { }

  async createTicket(createTicketDto: TicketDto, userId?: string): Promise<Ticket> {
    // 1. Validación de formato de seguridad (por si el DTO es omitido)
    if (!/^[A-Z]{4}-\d{6}$/.test(createTicketDto.caseNumber)) {
      throw new BadRequestException('El número de caso debe tener el formato: 4 letras mayúsculas, guion y 6 números (ej. DIST-506009)');
    }

    let attempts = 0;
    const maxAttempts = 5;
    let currentCaseNumber = createTicketDto.caseNumber;

    // 2. Bucle para garantizar que no haya repetición en la BD
    while (attempts < maxAttempts) {
      const existingTicket = await this.ticketRepository.findOne({
        caseNumber: currentCaseNumber
      } as any);

      if (!existingTicket) {
        // ✅ No existe, es seguro crearlo
        const newTicket = this.ticketRepository.create({
          ...createTicketDto,
          caseNumber: currentCaseNumber,
          operatorResponsable: userId || undefined,
        });
        const savedTicket = await this.ticketRepository.save(newTicket);
        return Array.isArray(savedTicket) ? savedTicket[0]! : savedTicket;
      }

      // ⚠️ Ya existe, generamos uno nuevo con el mismo prefijo
      attempts++;
      const prefix = currentCaseNumber.split('-')[0] || 'TCKT';
      const randomNum = Math.floor(100000 + Math.random() * 900000).toString();
      currentCaseNumber = `${prefix}-${randomNum}`;
    }

    throw new BadRequestException('No se pudo generar un número de ticket único después de varios intentos. Intente nuevamente.');
  }

async findAllPaginated(
    page = 1,
    limit = 10,
    filters: {
      caseNumber?: string;
      subject?: string;
      status?: string;
      excludeStatus?: string;
      primerNombre?: string;
      operatorId?: string;
      tipoCliente?: string; 
      incidentType?: string;
    } = {},
  ) {
    console.log('🔍 [findAllPaginated] Filtros recibidos:', filters);

    const take = limit > 0 ? limit : 10;
    const skip = page > 1 ? (page - 1) * take : 0;
    const where = await this.buildSearchFilter(filters);

    console.log('🔍 [findAllPaginated] Where generado:', JSON.stringify(where, null, 2));

    const findOptions: Record<string, unknown> = {
      skip,
      take,
      order: { createdAt: 'DESC' },
    };

    if (where) {
      findOptions.where = where;
    }

    const [data, total] = await Promise.all([
      this.ticketRepository.find(findOptions as any)
        .then(tickets => {
          console.log(`📦 [findAllPaginated] Tickets encontrados en BD: ${tickets.length}`);
          return Promise.all(
            tickets.map(async (ticket) => {
              if (ticket.tipoCliente && typeof ticket.tipoCliente === 'string') {
                try {
                  const tipoClienteDoc = await this.miscellaneousRepository.findOne({
                    _id: new ObjectId(ticket.tipoCliente)
                  } as any);
                  if (tipoClienteDoc) {
                    (ticket as any).tipoCliente = tipoClienteDoc;
                  }
                } catch (error) {
                  console.warn('⚠️ Error populando tipoCliente:', error);
                }
              }

              if (Array.isArray(ticket.serviciosAfectados) && ticket.serviciosAfectados.length > 0) {
                try {
                  const idsValidos = ticket.serviciosAfectados
                    .filter((id: any) => typeof id === 'string' && id.length === 24);

                  if (idsValidos.length > 0) {
                    const serviciosEncontrados = await this.serviceRepository.find({
                      where: {
                        _id: { $in: idsValidos.map((id: string) => new ObjectId(id)) }
                      } as any
                    });

                    if (serviciosEncontrados.length > 0) {
                      ticket.serviciosAfectados = serviciosEncontrados as any;
                    }
                  }
                } catch (error) {
                  console.warn('⚠️ Error populando serviciosAfectados:', error);
                }
              }

              return ticket;
            })
          );
        }),
      where ? this.ticketRepository.count(where) : this.ticketRepository.count(),
    ]);

    const enrichedData = await this.enrichTicketsWithUsers(data);

    const statusOrder: Record<string, number> = {
      [TICKET_STATUS.EN_GESTION]: 1,
      [TICKET_STATUS.ACTIVO]: 2,
      [TICKET_STATUS.CERRADO]: 3,
    };

    const sortedData = enrichedData.sort((a: any, b: any) => {
      const orderA = statusOrder[a.status] || 999;
      const orderB = statusOrder[b.status] || 999;

      if (orderA === orderB) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return orderA - orderB;
    });

    return {
      data: sortedData,
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  private async enrichTicketsWithUsers(tickets: Ticket[]) {
    const userIds = new Set<string>();

    for (const ticket of tickets) {
      if (ticket.operatorAsignado) userIds.add(ticket.operatorAsignado);
      if (ticket.operatorResponsable) userIds.add(ticket.operatorResponsable);
    }

    const userMap = new Map<string, Omit<User, 'clave'>>();

    await Promise.all(
      [...userIds].map(async (id) => {
        try {
          const user = await this.usersService.findUserById(id);
          const { clave, ...userWithoutPassword } = user;
          void clave;
          userMap.set(id, userWithoutPassword);
        } catch {
          // Ignorar errores de usuario no encontrado
        }
      }),
    );

    return tickets.map((ticket) => ({
      ...ticket,
      operatorAsignado: ticket.operatorAsignado
        ? userMap.get(ticket.operatorAsignado) ?? ticket.operatorAsignado
        : ticket.operatorAsignado,
      operatorResponsable: ticket.operatorResponsable
        ? userMap.get(ticket.operatorResponsable) ?? ticket.operatorResponsable
        : ticket.operatorResponsable,
    }));
  }

  private async buildSearchFilter(filters: {
    caseNumber?: string;
    subject?: string;
    status?: string;
    excludeStatus?: string;
    primerNombre?: string;
    operatorId?: string;
    tipoCliente?: string; 
    incidentType?: string; 
  }) {
    const where: Record<string, unknown> = {};

    if (filters.caseNumber?.trim()) {
      where.caseNumber = { $regex: filters.caseNumber.trim(), $options: 'i' };
    }

    if (filters.subject?.trim()) {
      where.subject = { $regex: filters.subject.trim(), $options: 'i' };
    }

    if (filters.status?.trim()) {
      const statusArray = filters.status.split(',').map(s => s.trim()).filter(Boolean);
      if (statusArray.length > 1) {
        where.status = { $in: statusArray.map(s => new RegExp(`^${s}$`, 'i')) };
      } else if (statusArray.length === 1) {
        where.status = new RegExp(`^${statusArray[0]}$`, 'i');
      }
    } else if (filters.excludeStatus?.trim()) {
      where.status = { $not: new RegExp(`^${filters.excludeStatus.trim()}$`, 'i') };
    }

    if (filters.operatorId?.trim() || filters.primerNombre?.trim()) {
      const orConditions: any[] = [];
      if (filters.operatorId?.trim()) {
        orConditions.push({ operatorAsignado: filters.operatorId.trim() });
        orConditions.push({ operatorResponsable: filters.operatorId.trim() });
      }
      if (filters.primerNombre?.trim()) {
        const term = filters.primerNombre.trim();
        orConditions.push({ operatorResponsable: { $regex: term, $options: 'i' } });
        orConditions.push({ operatorAsignado: { $regex: term, $options: 'i' } });
        orConditions.push({ operador: { $regex: term, $options: 'i' } });
      }
      if (orConditions.length > 0) where.$or = orConditions;
    }

    // ✅ SOLUCIÓN DEFINITIVA: Buscar por string O por ObjectId usando $or
   if (filters.tipoCliente?.trim()) {
      const searchValue = filters.tipoCliente.trim();
      console.log('🔍 [buildSearchFilter] Filtrando por tipoCliente:', searchValue);
      
      if (/^[0-9a-fA-F]{24}$/.test(searchValue)) {
        try {
          // $in es perfectamente válido a nivel de campo en MongoDB
          where.tipoCliente = { 
            $in: [
              searchValue,              // Coincide si está guardado como string
              new ObjectId(searchValue) // Coincide si está guardado como ObjectId
            ] 
          };
          console.log('🔍 [buildSearchFilter] Buscando con $in (string u ObjectId)');
        } catch (e) {
          // Fallback por si acaso
          where.tipoCliente = searchValue;
        }
      } else {
        // Es un nombre (FALLA MASIVA, VENTANA, etc.)
        where.tipoCliente = searchValue;
      }
    }

    if (filters.incidentType?.trim()) {
      const searchValue = filters.incidentType.trim();
      console.log(' [buildSearchFilter] Filtrando por incidentType:', searchValue);
      where.incidentType = { $regex: searchValue, $options: 'i' };
    }

    console.log('🔍 [buildSearchFilter] Where final:', JSON.stringify(where, null, 2));
    return Object.keys(where).length > 0 ? where : null;
  }



  async findTicketById(id: string): Promise<Ticket> {
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new BadRequestException('ID inválido');
    }

    const ticket = await this.ticketRepository.findOneBy({ _id: objectId } as any);
    if (!ticket) {
      throw new NotFoundException(`Ticket con ID ${id} no encontrado`);
    }

    if (Array.isArray(ticket.serviciosAfectados) && ticket.serviciosAfectados.length > 0) {
      try {
        // Extraer IDs tanto si son strings como si son objetos con _id
        const idsValidos = ticket.serviciosAfectados
          .map((item: any) => {
            if (typeof item === 'string' && item.length === 24) return item;
            if (typeof item === 'object' && item !== null && item._id) return String(item._id);
            return null;
          })
          .filter((idStr: string | null): idStr is string => idStr !== null);

        if (idsValidos.length > 0) {
          const serviciosEncontrados = await this.serviceRepository.find({
            where: {
              _id: { $in: idsValidos.map((idStr: string) => new ObjectId(idStr)) }
            } as any
          });

          if (serviciosEncontrados.length > 0) {
            ticket.serviciosAfectados = serviciosEncontrados as any;
          }
        }
      } catch (error) {
        console.warn('⚠️ Error populando serviciosAfectados:', error);
      }
    }

    return {
      ...ticket,
      createdAt: ticket.createdAt || ticket._id.getTimestamp(),
      updatedAt: ticket.updatedAt || ticket.createdAt,
    };
  }

<<<<<<< HEAD
 
  async updateTicket(
    id: string,
    updateTicketDto: UpdateTicketDto,
    req?: Request,
  ): Promise<Ticket> {
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new BadRequestException('ID inválido');
    }
=======
  
  async updateTicket(id: string, updateTicketDto: UpdateTicketDto, req?: Request): Promise<Ticket> {
    let objectId: ObjectId;
    try { objectId = new ObjectId(id); } catch { throw new BadRequestException('ID inválido'); }
>>>>>>> 8c37972daa6400b85885bcb97dbe99abdf1ed005

    const oldTicket = await this.ticketRepository.findOne({ _id: objectId } as any);
    if (!oldTicket) throw new NotFoundException(`Ticket con ID ${id} no encontrado`);

    const updateData = Object.fromEntries(Object.entries(updateTicketDto).filter(([, value]) => value !== undefined));
    updateData.updatedAt = new Date();

    const result = await this.ticketRepository.updateOne({ _id: objectId }, { $set: updateData });
    if (result.matchedCount === 0) throw new NotFoundException(`Ticket con ID ${id} no encontrado`);

    return this.findTicketById(id);
  }


  async closeTicket(id: string, updateDto?: any, req?: Request): Promise<Ticket> {
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new BadRequestException('ID inválido');
    }

    const ticket = await this.ticketRepository.findOne({ _id: objectId } as any);
    if (!ticket) {
      throw new NotFoundException(`Ticket con ID ${id} no encontrado`);
    }


    const horaCierre = new Date();

    const formatDate = (dateVal: any) => {
      if (!dateVal) return 'N/A';
      try {
        return new Date(dateVal).toLocaleString('es-VE', {
          timeZone: 'America/Caracas',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch {
        return 'N/A';
      }
    };

    const currentDescription = ticket.description || ticket.bitacora || '';

    const lineaCierre = `Fecha y hora de cierre ticket: ${formatDate(horaCierre)}`;

    let finalDescription = currentDescription;
    if (!currentDescription.includes('Fecha y hora de cierre ticket:')) {
      finalDescription = currentDescription
        ? `${currentDescription}\n${lineaCierre}`
        : lineaCierre;
    } else {
      finalDescription = currentDescription.replace(
        /Fecha y hora de cierre ticket:.*/,
        lineaCierre
      );
    }

    const updateData: any = {
      status: TICKET_STATUS.CERRADO,
      horaCierreFalla: horaCierre,
      horaCierre: horaCierre,
      description: finalDescription,
      descripcion: finalDescription,
      updatedAt: new Date(),
    };
    if (updateDto) {
      if (updateDto.escaladoPor) updateData.escaladoPor = updateDto.escaladoPor;
      if (updateDto.imputable) updateData.imputable = updateDto.imputable;
    }

    await this.ticketRepository.updateOne(
      { _id: objectId },
      { $set: updateData },
    );

<<<<<<< HEAD

=======
    await this.ticketRepository.updateOne({ _id: objectId }, { $set: updateData });

    if (req) {
      const userData = (req as any).user;
      await this.notificationsService.notifyTicketClosure(ticket, userData?._id?.toString() || 'SYSTEM');
    }
>>>>>>> 8c37972daa6400b85885bcb97dbe99abdf1ed005

    return this.findTicketById(id);
  }

  
  // ✅ CORREGIDO: También actualiza updatedAt al reabrir
  async reopenTicket(id: string, req?: Request): Promise<Ticket> {
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new BadRequestException('ID inválido');
    }

    const ticket = await this.ticketRepository.findOne({ _id: objectId } as any);
    if (!ticket) {
      throw new NotFoundException(`Ticket con ID ${id} no encontrado`);
    }

    const userData = (req as any).user;

    if (!userData || (userData.isAdmin !== true && userData.role !== 'admin')) {
      throw new ForbiddenException('Solo los administradores pueden reabrir tickets');
    }

    const updateData = { status: TICKET_STATUS.ACTIVO, updatedAt: new Date() };
    await this.ticketRepository.updateOne({ _id: objectId }, { $set: updateData });

<<<<<<< HEAD
    await this.ticketRepository.updateOne(
      { _id: objectId },
      { $set: updateData },
    );


=======
>>>>>>> 8c37972daa6400b85885bcb97dbe99abdf1ed005

    return this.findTicketById(id);
  }

<<<<<<< HEAD
/*private async createAuditLog(
  recordId: string,
  moduleId: string,
  action: string,
  user: any,
  oldValue: any,
  newValue: any,
  req: Request,
  details: string,
) {
  try {
    const rawUserId = user?.sub ?? user?._id;
    const userEmail = user?.email ?? user?.userEmail;
    
    // 🔍 DEBUG: Verificar qué llega
    this.logger.log(`📝 [createAuditLog] oldValue type: ${typeof oldValue}, isArray: ${Array.isArray(oldValue)}`);
    this.logger.log(`📝 [createAuditLog] oldValue keys: ${oldValue ? Object.keys(oldValue).length : 0}`);
    
    
    const auditData = {
      userId: rawUserId ? this.safeObjectId(rawUserId) : undefined,
      userEmail: userEmail || undefined,
      action,
      moduleId,
      // ✅ CAMBIO: Verificar si es un objeto con propiedades, no solo si es truthy
      oldValue: (oldValue && typeof oldValue === 'object' && Object.keys(oldValue).length > 0)
        ? JSON.stringify(oldValue)
        : undefined,
      newValue: (newValue && typeof newValue === 'object' && Object.keys(newValue).length > 0)
        ? JSON.stringify(newValue)
        : undefined,
      ipAddress: getClientIp(req),
      recordId,
      eventDate: new Date(),
      details,
    };
    
    const auditLog = this.auditLogRepository.create(auditData);
    await this.auditLogRepository.save(auditLog);
    
    this.logger.log(`✅ [createAuditLog] Auditoría guardada. oldValue guardado: ${!!auditData.oldValue}`);
  } catch (error) {
    console.error('❌ Error creando log de auditoría:', error);
  }
}*/

  private safeObjectId(id: any): ObjectId | undefined {
    if (!id) return undefined;
    try {
      return new ObjectId(id);
    } catch {
      return undefined;
    }
  }

  private async enrichTicketForAudit(ticket: any) {
    if (!ticket) return null;
    const enriched = { ...ticket };

    const getMiscName = async (id: string) => {
      if (!id || typeof id !== 'string') return id;
      try {
        const item = await this.miscellaneousRepository.findOne({ _id: new ObjectId(id) } as any);
        return item?.valor || id;
      } catch {
        return id;
      }
    };

    const getUserName = async (id: string) => {
      if (!id || typeof id !== 'string') return id;
      try {
        const user = await this.usersService.findUserById(id);
        return user ? `${user.primerNombre || ''} ${user.primerApellido || ''}`.trim() || user.username || id : id;
      } catch {
        return id;
      }
    };

    const miscFields = [
      'networkCategory', 'subcategoria', 'detalle', 'tipoCliente',
      'escaladoA', 'causaRaiz', 'SolucionCaso'
    ];
    for (const field of miscFields) {
      if (enriched[field]) {
        enriched[field] = await getMiscName(enriched[field]);
      }
    }

    if (Array.isArray(enriched.serviciosAfectados)) {
      enriched.serviciosAfectados = await Promise.all(
        enriched.serviciosAfectados.map((id: string) => getMiscName(id))
      );
    }

    const userFields = ['operatorResponsable', 'operatorAsignado'];
    for (const field of userFields) {
      if (enriched[field]) {
        enriched[field] = await getUserName(enriched[field]);
      }
    }

    return enriched;
  }
=======
>>>>>>> 8c37972daa6400b85885bcb97dbe99abdf1ed005

  async stats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const totalIncidencias = await this.ticketRepository.count({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    } as any);

    const enGestion = await this.ticketRepository.count({
      status: TICKET_STATUS.EN_GESTION,
    } as any);

    const casosActivos = await this.ticketRepository.count({
      status: TICKET_STATUS.ACTIVO,
    } as any);

    const casosCerrados = await this.ticketRepository.count({
      status: TICKET_STATUS.CERRADO,
    } as any);

    return {
      totalIncidencias: enGestion + casosActivos + casosCerrados,
      enGestion,
      casosActivos,
      casosCerrados,
    };
  }

  async getReporteIncidencias(mes: string, tipoServicio?: string) {
    const [year, month] = mes.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    const pipeline: any[] = [
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $unwind: '$serviciosAfectados' },
      { $addFields: { servicioIdObj: { $convert: { input: '$serviciosAfectados', to: 'objectId', onError: null, onNull: null } } } },
      { $match: { servicioIdObj: { $ne: null } } },
      { $lookup: { from: 'services', localField: 'servicioIdObj', foreignField: '_id', as: 'servicioDoc' } },
      { $unwind: { path: '$servicioDoc', preserveNullAndEmptyArrays: false } },
    ];

    if (tipoServicio) pipeline.push({ $match: { 'servicioDoc.tipoServicio': tipoServicio } });

    pipeline.push(
      {
        $group: {
          _id: '$servicioDoc._id',
          tipoServicio: { $first: { $ifNull: ['$servicioDoc.tipoServicio', 'N/A'] } },
          servicioNombre: { $first: { $ifNull: ['$servicioDoc.name', { $ifNull: ['$servicioDoc.id_circuito', 'Servicio desconocido'] }] } },
          id_circuito: { $first: '$servicioDoc.id_circuito' },
          id_netuno: { $first: '$servicioDoc.id_netuno' },
          contrato: { $first: '$servicioDoc.contrato' },
          ultimaMilla: { $first: '$servicioDoc.ultimaMilla' },
          proveedorDelServicioCompartido: { $first: '$servicioDoc.proveedorDelServicioCompartido' },
          totalIncidencias: { $sum: 1 },
          abiertas: { $sum: { $cond: [{ $eq: [{ $toLower: { $ifNull: ['$status', ''] } }, 'cerrado'] }, 0, 1] } },
          cerradas: { $sum: { $cond: [{ $eq: [{ $toLower: { $ifNull: ['$status', ''] } }, 'cerrado'] }, 1, 0] } },
          ultimaIncidencia: { $max: '$createdAt' },
          tickets: {
            $push: {
              _id: { $toString: '$_id' }, caseNumber: { $ifNull: ['$caseNumber', 'S/N'] },
              subject: { $ifNull: ['$subject', 'Sin asunto'] }, status: { $ifNull: ['$status', 'N/A'] },
              createdAt: '$createdAt', incidentType: { $ifNull: ['$incidentType', 'Sin Clasificar'] },
            },
          },
        },
      },
      { $sort: { totalIncidencias: -1 } },
    );

    const servicios = await this.ticketRepository.aggregate(pipeline).toArray();
    const totales = servicios.reduce((acc: any, s: any) => ({
      total: acc.total + s.totalIncidencias, abiertas: acc.abiertas + s.abiertas,
      cerradas: acc.cerradas + s.cerradas, servicios: acc.servicios + 1,
    }), { total: 0, abiertas: 0, cerradas: 0, servicios: 0 });

    return { servicios, totales };
  }


  async findStaleTickets(beforeDate: Date) {
    return await this.ticketRepository.find({ where: { updatedAt: { $lte: beforeDate }, status: { $not: { $regex: /cerrado|closed|resuelto|cancelado/i } } } });
  }

  async findDelayedTickets(beforeDate: Date) {
    return await this.ticketRepository.find({ where: { updatedAt: { $lte: beforeDate }, operatorAsignado: { $exists: true }, status: { $not: { $regex: /cerrado|closed|resuelto|cancelado/i } } } });
  }



  async findUnassignedStaleTickets(beforeDate: Date) {
    return await this.ticketRepository.find({
      where: {
        updatedAt: { $lte: beforeDate },
        status: { $not: { $regex: /cerrado|closed|resuelto|cancelado/i } },
        $or: [{ operatorAsignado: { $exists: false } }, { operatorAsignado: null }, { operatorAsignado: '' }]
      }
    } as any);
  }

 
async getLeastLoadedOperator(excludeUserId?: string) {
  // 1. Obtener IDs de usuarios activos (online en los últimos 10 min)
  const activeUserIds = await this.userSessionsService.getActiveUserIds();

  // 2. Excluir al operador responsable de la lista de candidatos
  const candidateUserIds = excludeUserId 
    ? activeUserIds.filter(id => id !== String(excludeUserId))
    : activeUserIds;

  if (candidateUserIds.length === 0) {
    this.logger.warn('⚠️ No hay otros operadores online disponibles para asignación (excluyendo al responsable)');
    return null;
  }

  // 3. Contar tickets activos SOLO para los candidatos restantes
  const counts = await this.ticketRepository.aggregate([
    {
      $match: {
        status: { $not: { $regex: /cerrado|closed|resuelto|cancelado/i } },
        operatorAsignado: { $in: candidateUserIds }
      }
    },
    { $group: { _id: '$operatorAsignado', activeTickets: { $sum: 1 } } }
  ]).toArray();

  // 4. Obtener datos de los usuarios candidatos
  const allUsers = await this.usersService.findAll({ isActive: true });
  const onlineOperators = allUsers.filter(u =>
    candidateUserIds.includes(u._id.toString()) &&
    (u.role === 'operador' || u.role === 'admin' || u.role === 'editor')
  );

  if (onlineOperators.length === 0) {
    this.logger.warn('⚠️ No hay operadores online con roles válidos disponibles');
    return null;
    }

  // 5. Asignar la carga a cada operador online
  const operatorsWithLoad = onlineOperators.map(op => {
    const countData = counts.find(c => c._id === op._id.toString());
    return {
      user: op,
      load: countData ? countData.activeTickets : 0
    };
  });

  // 6. Ordenar por carga ascendente
  operatorsWithLoad.sort((a, b) => a.load - b.load);

  const selected = operatorsWithLoad[0].user;
  this.logger.log(`✅ Operador seleccionado: ${selected.email} con ${operatorsWithLoad[0].load} tickets activos`);

  return selected;
}
}