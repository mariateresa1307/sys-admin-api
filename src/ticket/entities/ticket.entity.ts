import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ObjectId,
} from 'typeorm';
import { TICKET_STATUS } from '../../utils/constants/tickets';

@Entity('tickets')
export class Ticket {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  caseNumber!: string;

  @Column()
  incidentType!: string;

  @Column()
  subject!: string;

  @Column()
  networkCategory!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: TICKET_STATUS.EN_GESTION })
  status: string = TICKET_STATUS.EN_GESTION;

  @Column()
  subcategoria!: string;

  @Column()
  detalle?: string;

  @Column()
  tipoCliente!: string;

  @Column()
  serviciosAfectados!: string[];

  @Column()
  ciudad!: string;

  @Column()
  estado!: string;

  @Column()
  localidad!: string;

  @Column()
  bitacora?: string;

  @Column()
  nodo?: string;

  @Column()
  abonado?: string;

  @Column()
  afectacion?: boolean;

  @Column()
  nombreCliente?: string;

  @Column({ nullable: true })
  horaInicioFalla?: string;

  @Column({ nullable: true })
  horaDeteccionNoc?: string;

  @Column({ nullable: true })
  horaInicioAtencion?: string;

  @Column({ nullable: true })
  horaEscalamiento?: string;

  @Column({ nullable: true })
  horaFinAfectacion?: string;

  @Column({ type: 'date', nullable: true })
  horaCierreFalla?: Date;

  @Column({ nullable: true })
  requiereEscalamiento?: string;

  @Column({ nullable: true })
  escaladoA?: string;

  @Column({ nullable: true })
  causaRaiz?: string;

  @Column({ nullable: true })
  SolucionCaso?: string;

  @Column({ nullable: true })
  turnoAsignado?: string;

  @Column({ nullable: true })
  ttZoho?: string;

  @Column({ nullable: true })
  ttClienteProveedor?: string;

  @Column({ nullable: true })
  operatorResponsable?: string;

  @Column({ nullable: true })
  operatorAsignado?: string;

  @Column({ nullable: true })
  operador?: string;

  @Column({ nullable: true })
  severidad?: string;

  @Column({ nullable: true })
  imputable?: string;

  @Column({ nullable: true })
  tDeteccion?: number;

  @Column({ nullable: true })
  tAtencion?: number;

  @Column({ nullable: true })
  tEscalado?: number;

  @Column({ nullable: true })
  escaladoPor?: string;

  @Column({ nullable: true })
  cCierreSoporte?: number;

  @Column({ nullable: true })
  mttrTotal?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
