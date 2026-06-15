import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ObjectId,
  Index,
} from 'typeorm';

@Entity('service')
export class Service {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  tipoServicio!: string;

  @Column()
  name!: string;

  @Column()
  city!: string;

  @Column()
  tipoCliente!: string;

  @Column({ nullable: true })
  ipNetuno?: string;

  @Column({ nullable: true })
  id_netuno!: string;

  @Column({ nullable: true })
  id_circuito!: string;

  @Column({ nullable: true })
  idRBS?: string;

  @Column({ nullable: true })
  serialONT?: string;

  @Column({ nullable: true })
  vlan?: number | null;

  @Column({ nullable: true })
  contrato?: number | null;

  @Column({ nullable: true })
  nodoA?: string;

  @Column({ nullable: true })
  nodoB?: string;

  @Column({ nullable: true })
  nodoOLT?: string;

  @Column({ nullable: true })
  diagramaRed?: string;

  @Column({ nullable: false })
  proveedorDelServicioCompartido!: string;

  @Column({ default: 'Activo' })
  status?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
