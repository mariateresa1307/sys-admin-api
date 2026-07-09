import { Body, Controller, Get,Param, Post, Put,  Query,  UsePipes,  ValidationPipe,UseGuards
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tickets')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
@UseGuards(JwtAuthGuard) 
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post()
  async create(@Body() createTicketDto: CreateTicketDto) {
    const ticket = await this.ticketService.createTicket(createTicketDto);
    return ticket;
  }

  @Get()
  async findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('caseNumber') caseNumber?: string,
    @Query('subject') subject?: string,
    @Query('status') status?: string,
    @Query('primerNombre') primerNombre?: string,
  ) {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    return this.ticketService.findAllPaginated(pageNumber, limitNumber, {
      caseNumber,
      subject,
      status,
      primerNombre,
    });
  }

  @Get('/stats')
  async stats() {
    const stats = await this.ticketService.stats();
    return stats;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
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
  ) {
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
