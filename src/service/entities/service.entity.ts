import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ObjectId,
} from 'typeorm';

@Entity('service')
export class Service {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column({ unique: true })
  id_netuno!: string;

  @Column()
  serial_ont!: string;

  @Column()
  id_circuito!:    string;

  @Column({ nullable: true })
  vlan?: number;

  @Column()
  nombre_cliente!: string;

  @Column({ nullable: true })
  contrato?: number;

  @Column({ nullable: true })
  nodoA?: string;

  @Column({ nullable: true })
  nodoB?: string;

  @Column({ nullable: true })
  nodoOLT?: string;

  @Column({ nullable: true })
  diagramaRed?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: true })
  status?: string;
}
