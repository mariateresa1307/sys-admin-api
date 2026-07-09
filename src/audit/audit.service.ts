// src/audit/audit.service.ts
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

  async createLog(dto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLogData: any = {
      userId: dto.userId ? new ObjectId(dto.userId) : undefined,
      action: dto.tipoAccion,
      moduleId: dto.moduleId,
      oldValue: dto.oldValue,
      newValue: dto.newValue,
      ipAddress: dto.ipAddress,
      macAddress: dto.macAddress,
      sourceApplication: dto.sourceApplication,
      recordId: dto.recordId,
      eventDate: dto.fecha ? new Date(dto.fecha) : undefined,
      details: dto.details,
    };

    const auditLog = this.auditLogRepository.create(auditLogData) as AuditLog;

    return await this.auditLogRepository.save(auditLog);
  }

  private buildQuery(filterDto: AuditFilterDto): any {
    const query: any = {};

    if (filterDto.userId) query.userId = new ObjectId(filterDto.userId);
    if (filterDto.action) query.action = filterDto.action;
    if (filterDto.module) query.moduleId = filterDto.module;

    if (filterDto.startDate || filterDto.endDate) {
      query.eventDate = {};
      if (filterDto.startDate) query.eventDate.$gte = new Date(filterDto.startDate);
      if (filterDto.endDate) {
        const end = new Date(filterDto.endDate);
        end.setHours(23, 59, 59, 999);
        query.eventDate.$lte = end;
      }
    }
    return query;
  }

  async findAll(filterDto: AuditFilterDto) {
    const query = this.buildQuery(filterDto);
    const page = Number(filterDto.page) || 1;
    const limit = Number(filterDto.limit) || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.auditLogRepository.find({
        where: query,
        order: { eventDate: 'DESC' },
        skip,
        take: limit,
      }),
      this.auditLogRepository.count({ where: query }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats(filterDto: AuditFilterDto) {
    const query = this.buildQuery(filterDto);

    const [total, byAction] = await Promise.all([
      this.auditLogRepository.count({ where: query }),
      this.auditLogRepository
        .aggregate([
          ...(Object.keys(query).length > 0 ? [{ $match: query }] : []),
          { $group: { _id: '$action', count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const actionMap = byAction.reduce((acc, curr) => {
      acc[curr._id as string] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      ediciones: (actionMap[AuditAction.UPDATE] || 0) + (actionMap[AuditAction.CREATE] || 0),
      eliminados: actionMap[AuditAction.DELETE] || 0,
      usuarios: actionMap[AuditAction.LOGIN] || 0,
      incidentes: actionMap[AuditAction.LOGIN_FAILED] || 0,
      historial: total,
    };
  }

  async exportLogsToExcel(filterDto: AuditFilterDto): Promise<Buffer> {
    const query = this.buildQuery(filterDto);
    const logs = await this.auditLogRepository.find({
      where: query,
      order: { eventDate: 'DESC' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema NOC';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Auditoría', {
      properties: { defaultRowHeight: 20 },
    });

    worksheet.columns = [
      { header: 'Fecha', key: 'eventDate', width: 22 },
      { header: 'Usuario', key: 'userEmail', width: 30 },
      { header: 'Acción', key: 'action', width: 16 },
      { header: 'Módulo', key: 'module', width: 18 },
      { header: 'IP', key: 'ipAddress', width: 16 },
      { header: 'Valor Anterior', key: 'oldValue', width: 32 },
      { header: 'Valor Nuevo', key: 'newValue', width: 32 },
      { header: 'Detalles', key: 'details', width: 40 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF080769' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    const actionColors: Record<string, string> = {
      LOGIN: 'FFE8F5E9', LOGIN_FAILED: 'FFFFEBEE', LOGOUT: 'FFF5F5F5',
      CREATE: 'FFE3F2FD', UPDATE: 'FFFFF9C4', DELETE: 'FFFFCDD2',
      EXPORT: 'FFE0F2F1',
    };

    logs.forEach((log, index) => {
      const row = worksheet.addRow({
        eventDate: log.eventDate
          ? new Intl.DateTimeFormat('es-VE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(log.eventDate))
          : '',
        userEmail: log.userEmail || '',
        action: log.action,
        module: log.moduleId || '',
        ipAddress: log.ipAddress || '',
        oldValue: log.oldValue || '',
        newValue: log.newValue || '',
        details: log.details || '',
      });

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
        if (colNumber === 3) {
          const actionKey = log.action || '';
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: actionColors[actionKey] || 'FFFFFFFF' } };
          cell.font = { bold: true };
        }
      });

      if (index % 2 === 0) {
        row.eachCell((cell, colNumber) => {
          if (colNumber !== 3) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
        });
      }
    });

    worksheet.addRow([]);
    const summaryRow = worksheet.addRow([
      `Total de registros: ${logs.length} | Generado el: ${new Intl.DateTimeFormat('es-VE', {
        dateStyle: 'long', timeStyle: 'medium',
      }).format(new Date())}`,
    ]);
    worksheet.mergeCells(summaryRow.number, 1, summaryRow.number, 8);
    summaryRow.getCell(1).font = { italic: true, color: { argb: 'FF64748B' } };
    summaryRow.getCell(1).alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }
}