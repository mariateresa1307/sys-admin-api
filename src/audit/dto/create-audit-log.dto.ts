import {
  IsMongoId,
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsIP,
  IsMACAddress,
} from 'class-validator';

export class CreateAuditLogDto {
  @IsOptional()
  @IsMongoId()
  idUsuario?: string;

  @IsDateString()
  fecha: string;

  @IsString()
  @IsNotEmpty()
  tipoAccion: string;

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
}
