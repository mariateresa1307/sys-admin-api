import {
  BadRequestException,
  Injectable,
  NotFoundException,
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
import { Request } from 'express'; // ✅ 1. Importar Request

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: MongoRepository<Ticket>,
    private readonly usersService: UsersService,
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
      primerNombre?: string;
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

    return {
      data: enrichedData,
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  private async enrichTicketsWithUsers(tickets: Ticket[]) {
    const userIds = new Set<string>();

    for (const ticket of tickets) {
      if (ticket.operatorAsignado) {
        userIds.add(ticket.operatorAsignado);
      }
      if (ticket.operatorResponsable) {
        userIds.add(ticket.operatorResponsable);
      }
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
          // Usuario no encontrado, se omite
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
    primerNombre?: string;
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

 
  async updateTicket(
    id: string,
    updateTicketDto: UpdateTicketDto,
    req?: Request, // ✅ 2. Recibir el request
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
      // Eliminamos el _id interno para que el log de auditoría sea limpio
      const { _id: _, ...safeOldData } = oldTicket as any;
      (req as any).oldValue = safeOldData;
    }

    // ✅ 5. Realizar la actualización
    const result = await this.ticketRepository.updateOne(
      { _id: objectId },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException(`Ticket con ID ${id} no encontrado`);
    }

    // ✅ 6. Retornar el registro actualizado
    return this.findTicketById(id);
  }

  async stats() {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const endOfToday = new Date().setHours(23, 59, 59, 59);

    // ✅ 7. Corregido: 'filter' en lugar de 'flter'
    const filter = {
      createdAt: {
        $gte: new Date(startOfToday),
        $lte: new Date(endOfToday),
      },
    };

    const enGestion = await this.ticketRepository.count({
      ...filter,
      status: TICKET_STATUS.EN_GESTION,
    } as any);

    const casosActivos = await this.ticketRepository.count({
      ...filter,
      status: TICKET_STATUS.ACTIVO,
    } as any);

    const casosCerrados = await this.ticketRepository.count({
      ...filter,
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