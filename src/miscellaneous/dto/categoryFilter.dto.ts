import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CategoryFilterDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  categoria?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  tipoIncidencia!: string;
}
