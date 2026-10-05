import { Controller, Get, Query, Res, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as ExcelJS from 'exceljs';
import dayjs from 'dayjs';

@Controller('reports')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('preview')
  getPreview(@Query() filterDto: ReportFilterDto) {
    return this.reportsService.getPreview(filterDto);
  }

  @Get('export')
  async exportReport(
    @Query() filterDto: ReportFilterDto,
    @Res() res: Response,
  ) {
    console.log('📊 [Export Controller] Filtros recibidos:', filterDto);
    
    // Obtener tickets usando el mismo método que el preview
    const tickets = await this.reportsService.getTicketsForExport(filterDto);
    
    console.log('📊 [Export Controller] Tickets para exportar:', tickets.length);

    if (tickets.length === 0) {
      console.log('⚠️ [Export Controller] No hay tickets para exportar');
      return res.status(404).json({
        message: 'No hay tickets para exportar en este período',
        filters: filterDto
      });
    }

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tickets Cerrados');

    // Definir columnas
    worksheet.columns = [
      { header: 'ID Ticket', key: 'numeroTicket', width: 15 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'Afectación', key: 'afectacion', width: 15 },
      { header: 'Fecha Creación', key: 'fechaCreacion', width: 20 },
      { header: 'Fecha Cierre', key: 'fechaCierre', width: 20 },
      { header: 'Tipo Incidencia', key: 'tipoIncidencia', width: 20 },
      { header: 'Categoría Red', key: 'networkCategory', width: 20 },
      { header: 'Tipo Cliente', key: 'tipoCliente', width: 20 },
      { header: 'Ciudad', key: 'city', width: 20 },
      { header: 'Estado', key: 'estado', width: 20 },
      { header: 'MTTR (min)', key: 'mttrTotal', width: 15 },
      { header: 'Escalado', key: 'escaladoA', width: 15 },
      { header: 'Operador', key: 'operador', width: 20 },
    ];

    // Agregar datos
    tickets.forEach(ticket => {
      worksheet.addRow({
        numeroTicket: ticket.numeroTicket || 'N/A',
        status: ticket.status || 'N/A',
        afectacion: ticket.afectacion || 'N/A',
        fechaCreacion: dayjs(ticket.createdAt).format('YYYY-MM-DD HH:mm:ss'),
        fechaCierre: dayjs(ticket.closedAt || ticket.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
        tipoIncidencia: ticket.tipoIncidencia || 'N/A',
        networkCategory: ticket.networkCategory || 'N/A',
        tipoCliente: ticket.tipoCliente || 'N/A',
        city: ticket.city || 'N/A',
        estado: ticket.estado || 'N/A',
        mttrTotal: ticket.mttrTotal || 0,
        escaladoA: ticket.escaladoA || 'NO',
        operador: ticket.operador || 'N/A',
      });
    });

    // Estilar encabezados
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF080769' },
    };

    // Generar y enviar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Reporte_Operaciones_${filterDto.mes || 'todos'}_${Date.now()}.xlsx`;
    
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );

    console.log('✅ [Export Controller] Archivo generado:', fileName);
    return res.send(buffer);
  }
}