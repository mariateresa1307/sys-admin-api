import { Controller, Get, Post, Body, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuditService } from './audit.service';
import { AuditFilterDto } from './dto/audit-filter.dto';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('audit')
@UseGuards(JwtAuthGuard) 
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(@Query() filterDto: AuditFilterDto) {
    return this.auditService.findAll(filterDto);
  }

  @Get('stats')
  stats(@Query() filterDto: AuditFilterDto) {
    return this.auditService.getStats(filterDto);
  }

  @Get('export')
  async exportExcel(
    @Query() filterDto: AuditFilterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.auditService.exportLogsToExcel(filterDto);
    const fileName = `auditoria-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }

  @Post('log')
  create(@Body() dto: CreateAuditLogDto) {
    return this.auditService.createLog(dto);
  }
}