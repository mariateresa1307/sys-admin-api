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
 
  
  @Column()
  tipoServicio!: string; 

  @Column()
  name!: string;

  @Column()
  city!: string;

  @Column()
  tipo_cliente!: string;

  @Column({ unique: true, nullable: true })
  id_netuno!: string;

      @Column({unique: true, nullable: true })
  id_circuito!: string;

  
  @Column({ nullable: true })
  serial_ont?: string;

  @Column({ nullable: true })
  vlan?: number;

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

  @Column({ default: 'Activo' })
  status?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}