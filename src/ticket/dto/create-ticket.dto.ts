import { IsNotEmpty, IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  caseNumber!: string;

  @IsString()
  @IsNotEmpty()
  incidentType!: string;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  networkCategory!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsNotEmpty()
  subcategoria!: string;

  @IsString()
  @IsNotEmpty()
  detalle?: string;

  @IsString()
  @IsOptional()
  tipoCliente?: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  serviciosAfectados!: string[];

  @IsString()
  @IsNotEmpty()
  ciudad!: string;

  @IsString()
  @IsNotEmpty()
  estado!: string;

  @IsString()
  @IsNotEmpty()
  localidad!: string;

  @IsString()
  @IsOptional()
  bitacora?: string;

  @IsString()
  @IsOptional()
  nodo?: string;

  @IsString()
  @IsOptional()
  abonado?: string;

  @IsString()
  @IsOptional()
  nombreCliente?: string;

  @IsBoolean()
  @IsOptional()
  afectacion?: boolean;
}
