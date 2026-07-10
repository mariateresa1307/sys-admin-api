import { IsOptional, IsMongoId, IsDateString, IsString, isEnum } from 'class-validator';
import { AuditAction, AuditModule } from '../../auth/entities/audit-log.entity';

export class AuditFilterDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;
  
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  moduleId?: string;


  @IsDateString()
  startDate?: string;

  @IsDateString()
  endDate?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}
