import {
  IsMongoId,
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsIP,
  IsMACAddress,
  IsEnum,
} from 'class-validator';
import { AuditAction, AuditModule } from '../../auth/entities/audit-log.entity';

export class CreateAuditLogDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsDateString()
  fecha?: string;

  @IsString()
  @IsNotEmpty()
  tipoAccion?: string;


  @IsString()
  userEmail?: string;

  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsString()
  moduleId?: string;

  @IsOptional()
  @IsString()
  oldValue?: string;

  @IsOptional()
  @IsString()
  newValue?: string;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsOptional()
  @IsMACAddress()
  macAddress?: string;

  @IsOptional()
  @IsString()
  sourceApplication?: string;

  @IsOptional()
  @IsString()
  recordId?: string;

  @IsOptional()
  @IsString()
  details?: string;

}
