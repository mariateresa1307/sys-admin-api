import { ObjectId } from 'mongodb';
export class ServiceResponseDto {
  _id?: string;
  tipoServicio?: string;
  name?: string;
  city?: string;
  tipo_cliente?: string;
  idNetuno?: string; 
  idDOG?: string;
  id_Circuito?: string;
  serialONT?: string;
  nodeA?: string;
  nodeB?: string;
  oltnode?: string;
  contrato?: number;
  vlan?: number | string;
  status?: string;
  instalado?: boolean | string;
  diagramaRed?: string;
}