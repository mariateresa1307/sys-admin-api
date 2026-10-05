import { IsNotEmpty, IsString, IsOptional, IsArray, IsBoolean, Matches } from 'class-validator';
import { CreateDateColumn } from 'typeorm';

export class TicketDto {
  @IsString()
  @IsNotEmpty({ message: 'El número de caso es obligatorio' })
   @Matches(/^[A-Z]{4}-\d{6}$/, {
    message: 'El número de caso debe tener el formato: 4 letras mayúsculas, guion y 6 números (ej. DIST-506009)',
  })
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

  @CreateDateColumn()
  @IsOptional()
  fechaAsignacionOpA?: Date;
}
