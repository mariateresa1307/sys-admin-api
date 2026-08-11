import {
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { CreateDateColumn } from 'typeorm';

export class UpdateTicketDto {
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
  subcategoria!: string;

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
  @IsOptional()
  horaInicioFalla?: string;

  @IsString()
  @IsOptional()
  horaDeteccionNoc?: string;

  @IsString()
  @IsOptional()
  horaInicioAtencion?: string;

  @IsString()
  @IsOptional()
  horaEscalamiento?: string;

  @IsString()
  @IsOptional()
  horaFinAfectacion?: string;

  @IsString()
  @IsOptional()
  horaCierreFalla?: string;

  @IsString()
  @IsOptional()
  requiereEscalamiento?: string;

  @IsString()
  @IsOptional()
  escaladoA?: string;

  @IsString()
  @IsOptional()
  causaRaiz?: string;

  @IsString()
  @IsOptional()
  SolucionCaso?: string;

  @IsString()
  @IsOptional()
  turnoAsignado?: string;

  @IsString()
  @IsOptional()
  ttZoho?: string;

  @IsString()
  @IsOptional()
  ttClienteProveedor?: string;

  @IsString()
  @IsOptional()
  operatorResponsable?: string;

  @IsString()
  @IsOptional()
  operatorAsignado?: string;

  @IsString()
  @IsOptional()
  operador?: string;

  @IsString()
  @IsOptional()
  severidad?: string;

  @IsString()
  @IsOptional()
  imputable?: string;

  @IsNumber()
  @IsOptional()
  tDeteccion?: number;

  @IsNumber()
  @IsOptional()
  tAtencion?: number;

  @IsNumber()
  @IsOptional()
  tEscalado?: number;

  @IsNumber()
  @IsOptional()
  cCierreSoporte?: number;

  @IsNumber()
  @IsOptional()
  mttrTotal?: number;

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
