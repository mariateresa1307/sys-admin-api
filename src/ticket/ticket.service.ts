import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { ObjectId } from 'mongodb';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TICKET_STATUS } from 'src/utils/constants/tickets';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: MongoRepository<Ticket>,
  ) { }

  async createTicket(createTicketDto: CreateTicketDto): Promise<Ticket> {
    const newTicket = this.ticketRepository.create(createTicketDto);
    return await this.ticketRepository.save(newTicket);
  }

  async findAllPaginated(page = 1, limit = 10) {
    const take = limit > 0 ? limit : 10;
    const skip = page > 1 ? (page - 1) * take : 0;

    const [data, total] = await Promise.all([
      this.ticketRepository.find({ skip, take, order: { createdAt: 'DESC' } }),
      this.ticketRepository.count(),
    ]);

    return {
      data,
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findTicketById(id: string): Promise<Ticket> {
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new BadRequestException('ID inválido');
    }

    const ticket = await this.ticketRepository.findOneBy({ _id: objectId });
    if (!ticket) {
      throw new NotFoundException(`Ticket con ID ${id} no encontrado`);
    }
    return ticket;
  }

  async updateTicket(
    id: string,
    updateTicketDto: UpdateTicketDto,
  ): Promise<Ticket> {
    const updateData: Partial<UpdateTicketDto> = {};
    if (updateTicketDto.caseNumber !== undefined) {
      updateData.caseNumber = updateTicketDto.caseNumber;
    }
    if (updateTicketDto.incidentType !== undefined) {
      updateData.incidentType = updateTicketDto.incidentType;
    }
    if (updateTicketDto.subject !== undefined) {
      updateData.subject = updateTicketDto.subject;
    }
    if (updateTicketDto.networkCategory !== undefined) {
      updateData.networkCategory = updateTicketDto.networkCategory;
    }
    if (updateTicketDto.description !== undefined) {
      updateData.description = updateTicketDto.description;
    }
    if (updateTicketDto.status !== undefined) {
      updateData.status = updateTicketDto.status;
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new BadRequestException('ID inválido');
    }

    const result = await this.ticketRepository.updateOne(
      { _id: objectId },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException(`Ticket con ID ${id} no encontrado`);
    }

    return this.findTicketById(id);
  }


  async stats() {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const endOfToday = new Date().setHours(23, 59, 59, 59);

    const flter = {
      createdAt: { $gte: new Date(startOfToday), $lte: new Date(endOfToday) }
    }

    const enGestion = await this.ticketRepository.count({
      ...flter,
      status: TICKET_STATUS.EN_GESTION
    });




    return {
      totalIncidencias: enGestion,
      enGestion,
      casosActivos: "",
      casosCerrados: ""

    }
  }
}
