import { IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';

export class ServiceResponseDto {
  _id?: string;
  tipoServicio?: string;
  name?: string;
  city?: string;
  tipo_cliente?: string;
  ipNetuno?: string;
  id_netuno?: string;
  id_circuito?: string;
  idRBS?: string;
  serialONT?: string;
  nodoA?: string;
  nodoB?: string;
  nodoOLT?: string;

  contrato?: number | null;
  vlan?: string | null; // ✅ Cambiado a string para soportar "600-609"
  status?: string;
  instalado?: boolean | string;
  diagramaRed?: string;
}

export class ServiceDto {
  @IsString()
  @IsNotEmpty()
  tipoServicio?: string;

  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsString()
  @IsNotEmpty()
  city?: string;



  @IsString()
  @IsOptional()
  tipoCliente?: string;

  @IsString()
  @IsOptional() // ✅ Cambiado a Optional para permitir null cuando es METROLAN
  proveedorDelServicioCompartido?: string;

  @IsString()
  @IsOptional()
  ipNetuno?: string;

  @IsString()
  @IsOptional()
  id_netuno?: string;

  @IsString()
  @IsOptional()
  id_circuito?: string;

  @IsString()
  @IsOptional()
  idRBS?: string;

  @IsString()
  @IsOptional()
  serialONT?: string;

  @IsString()
  @IsOptional()
  nodoA?: string;

  @IsString()
  @IsOptional()
  nodoB?: string;

  @IsString()
  @IsOptional()
  nodoOLT?: string;

  @IsNumber()
  @IsOptional()
  contrato?: number;

  @IsString() // ✅ Cambiado de @IsNumber() a @IsString()
  @IsOptional()
  vlan?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  instalado?: boolean | string;

  @IsString()
  @IsOptional()
  diagramaRed?: string;

  @IsString()
  @IsOptional()
  idDOG?: string;

  @IsString()
  @IsOptional()
  proveedorUM?: string;

  @IsString()
  @IsOptional() 
  ultimaMilla?: string;

  @IsString()
  @IsOptional()
  proveedor?: string;
}