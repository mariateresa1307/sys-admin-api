// src/miscellaneous/dto/update-miscellaneous.dto.ts
import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';

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
  tipoIncidencia?: string;

  // --- RELACIONES JERÁRQUICAS ---
  @IsString() @IsOptional() categoriaId?: string;
  @IsString() @IsOptional() subcategoriaId?: string;
  @IsString() @IsOptional() estadoId?: string;
  @IsString() @IsOptional() ciudadId?: string;
  @IsString() @IsOptional() causaId?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(3)
  nivel?: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}