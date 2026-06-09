import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuditService } from './audit.service';
import { AuditFilterDto } from './dto/audit-filter.dto';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('export')
  async exportExcel(
    @Query() filterDto: AuditFilterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.auditService.exportLogsToExcel(filterDto);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${filterDto.startDate.toString()} ${filterDto.endDate.toString()}.xlsx"`,
    );

    res.send(buffer);
  }
}
