import { ObjectId } from 'mongodb';
export class ServiceResponseDto {
  _id!: ObjectId;
  id_netuno!: string;
  serial_ont!: string;
  id_circuito?: string;
  vlan!: number;
  nombre_cliente?: string;
  contrato?: number;
  nodoA?: string;
  nodoB?: string;
  nodoOLT!: string;
  diagramaRed?: string;
  status!: string;
}