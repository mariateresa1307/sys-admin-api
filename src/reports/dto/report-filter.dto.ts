import { IsOptional, IsString } from 'class-validator';

export class ReportFilterDto {
  @IsOptional()
  @IsString()
  grupo?: string;

  @IsOptional()
  @IsString()
  plataforma?: string;

  @IsOptional()
  @IsString()
  cliente?: string;

  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @IsOptional()
  @IsString()
  fechaFin?: string;
}
