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
  ) {}

  async createTicket(createTicketDto: TicketDto): Promise<Ticket> {
    const newTicket = this.ticketRepository.create(createTicketDto);
    const savedTicket = await this.ticketRepository.save(newTicket);
    return Array.isArray(savedTicket) ? savedTicket[0]! : savedTicket;
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
      this.ticketRepository.find(findOptions as any),
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
      where.status = filters.status.trim();
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
    return ticket;
  }

  // ✅ MODIFICADO: Ahora enriquece oldValue y newValue con nombres legibles
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
      // ✅ Enriquecer oldValue con nombres legibles para la auditoría
      (req as any).oldValue = await this.enrichTicketForAudit(oldTicket);
    }

    const result = await this.ticketRepository.updateOne(
      { _id: objectId },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException(`Ticket con ID ${id} no encontrado`);
    }

    const updatedTicket = await this.findTicketById(id);

    if (req) {
      // ✅ Enriquecer newValue con nombres legibles para la auditoría
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

    const updateData = {
      status: TICKET_STATUS.CERRADO,
      horaCierreFalla: new Date(),
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
        { status: TICKET_STATUS.CERRADO, horaCierreFalla: updateData.horaCierreFalla },
        req,
        `Ticket ${ticket.caseNumber} cerrado por ${userData?.userEmail || 'usuario'}`,
      );
    }

    return this.findTicketById(id);
  }

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
      const auditData = {
        userId: user?._id ? new ObjectId(user._id) : undefined,
        userEmail: user?.userEmail || undefined,
        action,
        moduleId,
        oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
        newValue: newValue ? JSON.stringify(newValue) : undefined,
        ipAddress: req.ip,
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

  // ✅ NUEVO MÉTODO: Convierte IDs en nombres legibles para el log de auditoría
  private async enrichTicketForAudit(ticket: any) {
    if (!ticket) return null;
    const enriched = { ...ticket };

    // Helper para obtener nombre de Miscellaneous
    const getMiscName = async (id: string) => {
      if (!id || typeof id !== 'string') return id;
      try {
        const item = await this.miscellaneousRepository.findOne({ _id: new ObjectId(id) } as any);
        return item?.valor || id;
      } catch {
        return id;
      }
    };

    // Helper para obtener nombre de Usuario
    const getUserName = async (id: string) => {
      if (!id || typeof id !== 'string') return id;
      try {
        const user = await this.usersService.findUserById(id);
        return user ? `${user.primerNombre || ''} ${user.primerApellido || ''}`.trim() || user.username || id : id;
      } catch {
        return id;
      }
    };

    // 1. Campos que son referencias a Miscellaneous
    const miscFields = [
      'networkCategory', 'subcategoria', 'detalle', 'tipoCliente', 
      'escaladoA', 'causaRaiz', 'SolucionCaso'
    ];
    for (const field of miscFields) {
      if (enriched[field]) {
        enriched[field] = await getMiscName(enriched[field]);
      }
    }

    // 2. Servicios Afectados (es un array de IDs)
    if (Array.isArray(enriched.serviciosAfectados)) {
      enriched.serviciosAfectados = await Promise.all(
        enriched.serviciosAfectados.map((id: string) => getMiscName(id))
      );
    }

    // 3. Campos que son referencias a Usuarios
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