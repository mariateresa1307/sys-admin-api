import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { ObjectId } from 'mongodb';
import { AuditLog, AuditAction } from '../auth/entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditFilterDto } from './dto/audit-filter.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: MongoRepository<AuditLog>,
  ) {}

  private safeObjectId(id: any): any {
    if (!id) return null;
    try {
      return new ObjectId(id);
    } catch {
      return null; // Si no es un ObjectId válido de 24 caracteres, lo guarda como null
    }
  }

  async createLog(dto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLogData: any = {
      // ✅ USAR LA FUNCIÓN SEGURA AQUÍ
      userId: this.safeObjectId(dto.userId),
      userEmail: dto.userEmail || null,
      action: dto.tipoAccion || dto.action,
      moduleId: dto.moduleId,
      oldValue: dto.oldValue,
      newValue: dto.newValue,
      ipAddress: dto.ipAddress,
      macAddress: dto.macAddress,
      sourceApplication: dto.sourceApplication,
      recordId: this.safeObjectId(dto.recordId), // ✅ TAMBIÉN PROTEGIDO
      eventDate: dto.fecha ? new Date(dto.fecha) : new Date(),
      details: dto.details,
      userAgent: (dto as any).userAgent,
    };

    const auditLog = this.auditLogRepository.create(auditLogData) as AuditLog;
    return await this.auditLogRepository.save(auditLog);
  }

  private buildQuery(filterDto: AuditFilterDto): any {
    const query: any = {};

    // ✅ PROTEGIDO CONTRA IDs INVÁLIDOS EN FILTROS
    if (filterDto.userId) {
      query.userId = this.safeObjectId(filterDto.userId);
    }
    if (filterDto.action) query.action = filterDto.action;
    if (filterDto.moduleId) query.moduleId = filterDto.moduleId;

    if (filterDto.startDate || filterDto.endDate) {
      const dateConditions: any[] = [];
      
      const eventDateCondition: any = {};
      if (filterDto.startDate) eventDateCondition.$gte = new Date(filterDto.startDate);
      if (filterDto.endDate) {
        const end = new Date(filterDto.endDate);
        end.setHours(23, 59, 59, 999);
        eventDateCondition.$lte = end;
      }
      dateConditions.push({ eventDate: eventDateCondition });

      const createdAtCondition: any = {};
      if (filterDto.startDate) createdAtCondition.$gte = new Date(filterDto.startDate);
      if (filterDto.endDate) {
        const end = new Date(filterDto.endDate);
        end.setHours(23, 59, 59, 999);
        createdAtCondition.$lte = end;
      }
      dateConditions.push({ createdAt: createdAtCondition });

      query.$or = dateConditions;
    }
    
    return query;
  }

  private formatDateManual(date: Date): string {
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  async findAll(filterDto: AuditFilterDto) {
    console.log('🔍 [Backend] 1. filterDto recibido:', filterDto);

    const page = Number(filterDto.page) || 1;
    const limit = Number(filterDto.limit) || 10;
    const skip = (page - 1) * limit;
    
    const query = this.buildQuery(filterDto);
    console.log('🔍 [Backend] Query construida para MongoDB:', JSON.stringify(query));

    const data = await this.auditLogRepository.find({
      where: query,
      order: { eventDate: 'DESC' },
      skip,
      take: limit,
    });

    const countResult = await this.auditLogRepository.aggregate([
      { $match: query },
      { $count: 'total' }
    ]).toArray();

    const total = countResult.length > 0 ? countResult[0].total : 0;

    console.log('🔍 [Backend] Resultados: total =', total, ', data.length =', data.length);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats(filterDto?: AuditFilterDto) {
    const query: any = filterDto ? this.buildQuery(filterDto) : {};
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const aggregationResult = await this.auditLogRepository.aggregate([
      { $match: query },
      {
        $facet: {
          actionCounts: [{ $group: { _id: '$action', count: { $sum: 1 } } }],
          uniqueUsers: [
            { $match: { action: 'LOGIN', userEmail: { $nin: [null, ''] } } },
            { $group: { _id: '$userEmail' } },
            { $count: 'count' }
          ],
          todayLogs: [
            { $match: { eventDate: { $gte: startOfDay, $lte: endOfDay } } },
            { $count: 'count' }
          ]
        }
      }
    ]).toArray();

    const facetData = aggregationResult[0] || { actionCounts: [], uniqueUsers: [], todayLogs: [] };
    const actionMap = facetData.actionCounts.reduce((acc: Record<string, number>, curr: any) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    return {
      ediciones: (actionMap['UPDATE'] || 0) + (actionMap['CREATE'] || 0),
      eliminados: actionMap['DELETE'] || 0,
      usuarios: facetData.uniqueUsers.length > 0 ? facetData.uniqueUsers[0].count : 0,
      historial: facetData.todayLogs.length > 0 ? facetData.todayLogs[0].count : 0,
    };
  }

  // ✅ MÉTODO DE EXPORTACIÓN CON DISEÑO CORPORATIVO NETUNO
  async exportLogsToExcel(filterDto: AuditFilterDto): Promise<Buffer> {
    const query = this.buildQuery(filterDto);
    const logs = await this.auditLogRepository.find({ 
      where: query, 
      order: { createdAt: 'DESC' } 
    });

    console.log(`📊 [Excel] Exportando ${logs.length} registros con diseño corporativo...`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Noc HelpDesk';
    workbook.created = new Date();
    (workbook.properties as any).title = 'Reporte de Auditoría de Sistema';
    (workbook.properties as any).company = 'NetUno C.A. - RIF: J-30108335-0';
    
    const worksheet = workbook.addWorksheet('Auditoría', {
      properties: { defaultRowHeight: 20, defaultColWidth: 15 },
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        margins: { left: 0.7, right: 0.7, top: 1.0, bottom: 1.0, header: 0.5, footer: 0.5 }
      }
    });

    // ✅ 1. HEADER CORPORATIVO
    worksheet.mergeCells('A1:F1');
    const headerRow1 = worksheet.getRow(1);
    headerRow1.height = 40;
    headerRow1.getCell(1).value = 'NOC'; 
    headerRow1.getCell(1).font = { 
      bold: true, 
      size: 22, 
      color: { argb: 'FF121227' }, // Azul Marino Pantone 532C
      name: 'Calibri'
    };
    headerRow1.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow1.getCell(1).border = {
      bottom: { style: 'thick', color: { argb: 'FF6BB1E2' } } // Azul Celeste Pantone 284C
    };

    worksheet.mergeCells('A2:F2');
    const headerRow2 = worksheet.getRow(2);
    headerRow2.height = 30;
    headerRow2.getCell(1).value = 'REPORTE DE AUDITORÍA DE SISTEMA';
    headerRow2.getCell(1).font = { 
      bold: true, 
      size: 14, 
      color: { argb: 'FF6BB1E2' }, // Azul Celeste
      name: 'Calibri'
    };
    headerRow2.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

    worksheet.mergeCells('A3:F3');
    const headerRow3 = worksheet.getRow(3);
    headerRow3.height = 25;
    const generatedDate = new Date().toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'short' });
    headerRow3.getCell(1).value = `Generado: ${generatedDate} | Total de Registros: ${logs.length}`;
    headerRow3.getCell(1).font = { 
      italic: true, 
      size: 10, 
      color: { argb: 'FF808080' }, // Gris
      name: 'Calibri'
    };
    headerRow3.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }; // Corregido typo 'ali-gnment'

    // Espacio antes de la tabla
    worksheet.addRow([]);
    
    // ✅ 2. ENCABEZADOS DE TABLA
    const headersRow = worksheet.addRow([
      'FECHA / HORA',
      'USUARIO',
      'ACCIÓN',
      'MÓDULO',
      'IP',
      'DETALLES'
    ]);
    
    headersRow.height = 30;
    headersRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF121227' } }; // Azul Marino
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' }; // Calibri Bold, Blanco
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      };
    });

    // ✅ 3. COLORES CORPORATIVOS PARA ACCIONES
    const actionColors: Record<string, string> = {
      LOGIN: 'FFD4EDD9',        // Verde suave
      LOGOUT: 'FFF0F4F8',       // Gris azulado muy claro
      LOGIN_FAILED: 'FFF8D7DA', // Rojo suave
      CREATE: 'FFD1ECF1',       // Azul claro
      UPDATE: 'FFFFF3CD',       // Amarillo suave
      DELETE: 'FFF5C6CB',       // Rojo suave
      EXPORT: 'FFD1F2EB',       // Turquesa suave
    };

    // ✅ 4. DATOS DE LA TABLA
    logs.forEach((log: any, index) => {
      let formattedDate = 'SIN REGISTRO';
      
      // Nivel 1: eventDate
      if (log.eventDate) {
        const dateObj = new Date(log.eventDate);
        if (!isNaN(dateObj.getTime())) formattedDate = this.formatDateManual(dateObj);
      }
      // Nivel 2: createdAt
      if (formattedDate === 'SIN REGISTRO' && log.createdAt) {
        const dateObj = new Date(log.createdAt);
        if (!isNaN(dateObj.getTime())) formattedDate = this.formatDateManual(dateObj);
      }
      // Nivel 3: ObjectId timestamp (Infalible)
      if (formattedDate === 'SIN REGISTRO' && log._id) {
        try {
          const objectIdTimestamp = new ObjectId(log._id).getTimestamp();
          formattedDate = this.formatDateManual(objectIdTimestamp);
        } catch (error) {
          // Fallback final
        }
      }

      const row = worksheet.addRow([
        formattedDate,
        log.userEmail || 'Sistema',
        log.action || 'DESCONOCIDA',
        log.moduleId || log.module || 'GENERAL',
        log.ipAddress || 'N/A',
        log.details || '',
      ]);

      row.height = 25;
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.font = { name: 'Calibri', size: 10 }; // Calibri Regular

        // Resaltar columna de Acción
        if (colNumber === 3) {
          const actionKey = log.action || '';
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: actionColors[actionKey] || 'FFFFFFFF' } };
          cell.font = { bold: true, name: 'Calibri', size: 10 }; // Calibri Bold
        }
      });

      // Filas alternadas (Zebra striping) para mejor legibilidad
      if (index % 2 === 0) {
        row.eachCell((cell, colNumber) => {
          if (colNumber !== 3) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
        });
      }
    });

    // ✅ 5. FOOTER CORPORATIVO
    worksheet.addRow([]);
    const footerRow = worksheet.addRow(['']);
    footerRow.height = 30;
    
    const footerNumber = footerRow.number;
    worksheet.mergeCells(`A${footerNumber}:F${footerNumber}`);
    footerRow.getCell(1).value = 'NetUno C.A. - RIF: J-30108335-0 | Documento generado automáticamente por el Sistema de Auditoría';
    footerRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF808080' }, name: 'Calibri' };
    footerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    footerRow.getCell(1).border = {
      top: { style: 'thin', color: { argb: 'FF6BB1E2' } } // Línea Azul Celeste
    };

    // ✅ 6. AJUSTE AUTOMÁTICO DE COLUMNAS
    worksheet.columns.forEach((column, index) => {
      if (column) {
        let maxLength = 0;
        const maxWidths = [22, 35, 20, 20, 18, 60]; // Anchos máximos recomendados
        
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        
        column.width = Math.min(Math.max(maxLength + 2, 15), maxWidths[index] || 60);
      }
    });

    // ✅ 7. CONGELAR PANELES (Mantener encabezado visible al hacer scroll)
    worksheet.views = [{ state: 'frozen', ySplit: 5 }];

    const buffer = await workbook.xlsx.writeBuffer();
     return Buffer.from(buffer as unknown as Uint8Array);
  }
}