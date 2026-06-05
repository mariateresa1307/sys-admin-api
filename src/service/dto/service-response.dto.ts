import { ObjectId } from 'mongodb';
export class ServiceResponseDto {
  _id?: string;
  tipoServicio?: string;
  name?: string;
  city?: string;
  tipo_cliente?: string;

  id_netuno?: string; 
  id_circuito?: string;
  idRBS?: string ;
  serialONT?: string;
  nodoA?: string;
  nodoB?: string;
  nodoOLT?: string;

  contrato?: number | null;
  vlan?: number | String | null;
  status?: string;
  instalado?: boolean | string;
  diagramaRed?: string;
}