import { IsString, IsOptional, IsBoolean, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

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
  tipoIncidencia?: string;

   @IsString()
  @IsOptional()
  padreId?: string;

  @IsString()
  @IsOptional()
  padreNombre?: string;

  // --- RELACIONES JERÁRQUICAS ESPECÍFICAS ---
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