import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import * as ExcelJS from 'exceljs';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditFilterDto } from './dto/audit-filter.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async createLog(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      userId: createAuditLogDto.idUsuario
        ? new ObjectId(createAuditLogDto.idUsuario)
        : undefined,
      action: createAuditLogDto.tipoAccion,
      moduleId: createAuditLogDto.moduleId,
      oldValue: createAuditLogDto.oldValue,
      newValue: createAuditLogDto.newValue,
      ipAddress: createAuditLogDto.ipAddress,
      macAddress: createAuditLogDto.macAddress,
      sourceApplication: createAuditLogDto.sourceApplication,
      eventDate: createAuditLogDto.fecha ? new Date(createAuditLogDto.fecha) : undefined,
    });

    return await this.auditLogRepository.save(auditLog);
  }

  async findAll(filterDto: AuditFilterDto): Promise<AuditLog[]> {
    const query: any = {};

    if (filterDto.userId) {
      query.userId = new ObjectId(filterDto.userId);
    }

    if (filterDto.action) {
      query.action = filterDto.action;
    }

    if (filterDto.startDate || filterDto.endDate) {
      query.eventDate = {};
      if (filterDto.startDate) {
        query.eventDate.$gte = new Date(filterDto.startDate);
      }
      if (filterDto.endDate) {
        query.eventDate.$lte = new Date(filterDto.endDate);
      }
    }

    return await this.auditLogRepository.find({
      where: query,
      order: {
        eventDate: 'DESC',
      },
    });
  }

  async exportLogsToExcel(filterDto: AuditFilterDto): Promise<Buffer> {
    const logs = await this.findAll(filterDto);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Logs');

    worksheet.columns = [
      { header: 'Id', key: 'id', width: 36 },
      { header: 'Usuario', key: 'userId', width: 36 },
      { header: 'Email de usuario', key: 'userEmail', width: 32 },
      { header: 'Tipo de acción', key: 'action', width: 24 },
      { header: 'Módulo', key: 'moduleId', width: 24 },
      { header: 'Valor anterior', key: 'oldValue', width: 32 },
      { header: 'Valor nuevo', key: 'newValue', width: 32 },
      { header: 'Dirección IP', key: 'ipAddress', width: 18 },
      { header: 'Dirección MAC', key: 'macAddress', width: 18 },
      { header: 'Aplicación origen', key: 'sourceApplication', width: 24 },
      { header: 'Fecha evento', key: 'eventDate', width: 24 },
      { header: 'Fecha creación', key: 'createdAt', width: 24 },
    ];

    logs.forEach(log => {
      worksheet.addRow({
        id: log._id.toString(),
        userId: log.userId?.toString() ?? '',
        userEmail: log.userEmail ?? '',
        action: log.action,
        moduleId: log.moduleId ?? '',
        oldValue: log.oldValue ?? '',
        newValue: log.newValue ?? '',
        ipAddress: log.ipAddress ?? '',
        macAddress: log.macAddress ?? '',
        sourceApplication: log.sourceApplication ?? '',
        eventDate: log.eventDate ? log.eventDate.toISOString() : '',
        createdAt: log.createdAt ? log.createdAt.toISOString() : '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }
}
