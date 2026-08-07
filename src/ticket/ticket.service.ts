import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
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

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: MongoRepository<Ticket>,
    private readonly usersService: UsersService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: MongoRepository<AuditLog>,
    @InjectRepository(Miscellaneous)
    private readonly miscellaneousRepository: MongoRepository<Miscellaneous>,
    @InjectRepository(Service) 
    private readonly serviceRepository: MongoRepository<Service>,
  ) {}

  async createTicket(createTicketDto: TicketDto): Promise<Ticket> {
    let attempts = 0;
    const maxAttempts = 3;
    let currentCaseNumber = createTicketDto.caseNumber;

    while (attempts < maxAttempts) {
      const existingTicket = await this.ticketRepository.findOne({ 
        caseNumber: currentCaseNumber 
      } as any);

      if (!existingTicket) {
        const newTicket = this.ticketRepository.create({
          ...createTicketDto,
          caseNumber: currentCaseNumber,
        });
        const savedTicket = await this.ticketRepository.save(newTicket);
        return Array.isArray(savedTicket) ? savedTicket[0]! : savedTicket;
      }

      attempts++;
      const prefix = currentCaseNumber.split('-')[0] || 'TCK';
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      currentCaseNumber = `${prefix}-${randomNum}`;
    }

    throw new BadRequestException('No se pudo generar un número de ticket único. Intente nuevamente.');
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
    } = {},
  ) {
    const take = limit > 0 ? limit : 10;
    const skip = page > 1 ? (page - 1) * take : 0;
    const where = this.buildSearchFilter(filters);
    
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
        .then(tickets => Promise.all(
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
        )),
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

  private buildSearchFilter(filters: {
    caseNumber?: string;
    subject?: string;
    status?: string;
    excludeStatus?: string; 
    primerNombre?: string;
    operatorId?: string;
  }) {
    const where: Record<string, unknown> = {};

    if (filters.caseNumber?.trim()) {
      where.caseNumber = { $regex: filters.caseNumber.trim(), $options: 'i' };
    }

    if (filters.subject?.trim()) {
      where.subject = { $regex: filters.subject.trim(), $options: 'i' };
    }

     if (filters.status?.trim()) {
      const statusArray = filters.status.trim().split(',');
      if (statusArray.length > 1) {
        where.status = { $in: statusArray };
      } else {
        where.status = filters.status.trim();
      }
    } else if (filters.excludeStatus?.trim()) {
      where.status = { $ne: filters.excludeStatus.trim() };
    }

    if (filters.operatorId?.trim()) {
      where.$or = [
        { operatorAsignado: filters.operatorId.trim() },
        { operatorResponsable: filters.operatorId.trim() },
      ];
    }

    if (filters.primerNombre?.trim()) {
      const term = filters.primerNombre.trim();
      where.$or = [
        { operatorResponsable: { $regex: term, $options: 'i' } },
        { operatorAsignado: { $regex: term, $options: 'i' } },
        { operador: { $regex: term, $options: 'i' } },
      ];
    }

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

  // ✅ CORREGIDO: Lógica limpia y única, con updatedAt forzado
  async updateTicket(
    id: string,
    updateTicketDto: UpdateTicketDto,
    req?: Request, 
  ): Promise<Ticket> {
    const updateData = Object.fromEntries(
      Object.entries(updateTicketDto).filter(([, value]) => value !== undefined),
    );

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new BadRequestException('ID inválido');
    }

    const oldTicket = await this.ticketRepository.findOne({ _id: objectId } as any);
    
    if (oldTicket && req) {
      (req as any).oldValue = await this.enrichTicketForAudit(oldTicket);
    }

    // ✅ Fuerza la actualización de la fecha de modificación
    updateData.updatedAt = new Date();

    const result = await this.ticketRepository.updateOne(
      { _id: objectId },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException(`Ticket con ID ${id} no encontrado`);
    }

    const updatedTicket = await this.findTicketById(id);

    if (req) {
      (req as any).newValue = await this.enrichTicketForAudit(updatedTicket);
    }

    return updatedTicket;
  }

  async closeTicket(id: string, req?: Request): Promise<Ticket> {
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
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit'
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

    await this.ticketRepository.updateOne(
      { _id: objectId },
      { $set: updateData },
    );

    if (req) {
      const userData = (req as any).user;
      await this.createAuditLog(
        id,
        'TICKET',
        'UPDATE',
        userData,
        { status: ticket.status },
        { status: TICKET_STATUS.CERRADO, horaCierreFalla: horaCierre },
        req,
        `Ticket ${ticket.caseNumber} cerrado`,
      );
    }

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

    const updateData = {
      status: TICKET_STATUS.ACTIVO,
      updatedAt: new Date(), // ✅ Fuerza la actualización de la fecha de modificación
    };

    await this.ticketRepository.updateOne(
      { _id: objectId },
      { $set: updateData },
    );

    if (req) {
      await this.createAuditLog(
        id,
        'TICKET',
        'UPDATE',
        userData,
        { status: ticket.status },
        { status: TICKET_STATUS.ACTIVO },
        req,
        `Ticket ${ticket.caseNumber} reabierto por admin ${userData?.userEmail || 'usuario'}`,
      );
    }

    return this.findTicketById(id);
  }

  private async createAuditLog(
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
      const auditData = {
        userId: rawUserId ? this.safeObjectId(rawUserId) : undefined,
        userEmail: userEmail || undefined,
        action,
        moduleId,
        oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
        newValue: newValue ? JSON.stringify(newValue) : undefined,
        ipAddress: getClientIp(req),
        recordId,
        eventDate: new Date(),
        details,
      };
      const auditLog = this.auditLogRepository.create(auditData);
      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      console.error('❌ Error creando log de auditoría:', error);
    }
  }
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
}