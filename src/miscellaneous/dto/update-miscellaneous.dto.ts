// src/miscellaneous/dto/update-miscellaneous.dto.ts
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateMiscellaneousDto {
  @IsString()
  @IsOptional()
  categoria?: string;

  @IsString()
  @IsOptional()
  valor?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  padreId?: string;

  @IsString()
  @IsOptional()
  padreNombre?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}