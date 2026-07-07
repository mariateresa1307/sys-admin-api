import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateTicketDto {
  @IsString()
  @IsOptional()
  caseNumber?: string;

  @IsString()
  @IsOptional()
  incidentType?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  networkCategory?: string;

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
}
