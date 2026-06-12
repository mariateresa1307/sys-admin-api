import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CategoryFilterDto {
  @IsString()
  @IsOptional()
  categoria?: string;

  @IsString()
  @IsOptional()
  padreId?: string;

  @IsString()
  @IsOptional()
  valor?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  activo?: string;

  // Campos específicos para relaciones jerárquicas
  @IsString()
  @IsOptional()
  categoriaId?: string;        

  @IsString()
  @IsOptional()
  subcategoriaId?: string;  

  @IsString()
  @IsOptional()
  estadoId?: string;          

  @IsString()
  @IsOptional()
  ciudadId?: string;         

  @IsString()
  @IsOptional()
  causaId?: string;         
}