import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';

@Controller('tickets')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post()
  async create(
    @Body() createTicketDto: CreateTicketDto,
  ): Promise<TicketResponseDto> {
    const ticket = await this.ticketService.createTicket(createTicketDto);
    return {
      _id: ticket._id.toString(),
      caseNumber: ticket.caseNumber,
      incidentType: ticket.incidentType,
      subject: ticket.subject,
      networkCategory: ticket.networkCategory,
      description: ticket.description,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  @Get()
  async findAll(@Query('page') page = '1', @Query('limit') limit = '10') {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    return this.ticketService.findAllPaginated(pageNumber, limitNumber);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TicketResponseDto> {
    const ticket = await this.ticketService.findTicketById(id);
    return {
      _id: ticket._id.toString(),
      caseNumber: ticket.caseNumber,
      incidentType: ticket.incidentType,
      subject: ticket.subject,
      networkCategory: ticket.networkCategory,
      description: ticket.description,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
  ): Promise<TicketResponseDto> {
    const ticket = await this.ticketService.updateTicket(id, updateTicketDto);
    return {
      _id: ticket._id.toString(),
      caseNumber: ticket.caseNumber,
      incidentType: ticket.incidentType,
      subject: ticket.subject,
      networkCategory: ticket.networkCategory,
      description: ticket.description,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }
}
