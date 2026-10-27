import {
  Body, 
  Controller, 
  Get, 
  Param, 
  Post, 
  Patch, 
  Put, 
  Query, 
  UsePipes, 
  ValidationPipe, 
  UseGuards, 
  Req, 
  UseInterceptors 
} from '@nestjs/common';
import type { Request } from 'express';
import { TicketService } from './ticket.service';
import { TicketDto } from './dto/create-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AuditInterceptor } from 'src/audit/interceptors/audit.interceptor'; 

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
  constructor(private readonly ticketService: TicketService) { }

  @Post()
  async create(@Body() createTicketDto: TicketDto, @Req() req: Request) {
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const ticket = await this.ticketService.createTicket(createTicketDto, userId);
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
    @Query('operatorId') operatorId?: string,
    @Query('tipoCliente') tipoCliente?: string,
    @Query('incidentType') incidentType?: string,
  ) {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    return this.ticketService.findAllPaginated(pageNumber, limitNumber, {
      caseNumber,
      subject,
      status,
      primerNombre,
      operatorId,
      tipoCliente,
      incidentType,
    });
  }

  @Get('/stats')
  async stats() {
    const stats = await this.ticketService.stats();
    return stats;
  }

  @Get('reporte-incidencias')
  async reporteIncidencias(
    @Query('mes') mes?: string,
    @Query('tipoServicio') tipoServicio?: string,
  ) {
    const now = new Date();
    const mesDefault = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const mesValido = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : mesDefault;

    return this.ticketService.getReporteIncidencias(mesValido, tipoServicio);
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
  @UseInterceptors(AuditInterceptor) 
  async update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @Req() req: Request
  ) {
   
    const oldTicket = await this.ticketService.findTicketById(id);
    
    (req as any).oldValue = oldTicket;
    (req as any).newValue = updateTicketDto;
    
    return this.ticketService.updateTicket(id, updateTicketDto, req);
  }

  @Put(':id/close')
<<<<<<< HEAD
  @UseInterceptors(AuditInterceptor)
async closeTicket(@Param('id') id: string, @Req() req: Request, @Body() updateDto?: any) {
  const oldTicket = await this.ticketService.findTicketById(id);
  (req as any).oldValue = oldTicket;
  (req as any).newValue = { status: 'CERRADO' };
  return this.ticketService.closeTicket(id, updateDto, req);
}

  @Put(':id/reopen')
  @UseInterceptors(AuditInterceptor)
async reopenTicket(@Param('id') id: string, @Req() req: Request) {
  const oldTicket = await this.ticketService.findTicketById(id);
  (req as any).oldValue = oldTicket;
  (req as any).newValue = { status: 'ACTIVO' };
  return this.ticketService.reopenTicket(id, req);
}
=======
    @UseInterceptors(AuditInterceptor) 
  async closeTicket(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    // Nota: Si también quieres auditoría al cerrar, aplica la misma lógica aquí
    const oldTicket = await this.ticketService.findTicketById(id);
    (req as any).oldValue = oldTicket;
    (req as any).newValue = { status: 'CERRADO' };
    
    return this.ticketService.closeTicket(id, undefined, req);
  }

  @Put(':id/reopen')
   @UseInterceptors(AuditInterceptor)
  async reopenTicket(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    // Nota: Si también quieres auditoría al reabrir, aplica la misma lógica aquí
    const oldTicket = await this.ticketService.findTicketById(id);
    (req as any).oldValue = oldTicket;
    (req as any).newValue = { status: 'ACTIVO' };
    
    return this.ticketService.reopenTicket(id, req);
  }
>>>>>>> 8c37972daa6400b85885bcb97dbe99abdf1ed005
}