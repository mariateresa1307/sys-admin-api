// src/miscellaneous/dto/create-miscellaneous.dto.ts
import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreateMiscellaneousDto {
  @IsString()
  @IsNotEmpty()
  categoria!: string;

  @IsString()
  @IsNotEmpty()
  valor!: string;

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