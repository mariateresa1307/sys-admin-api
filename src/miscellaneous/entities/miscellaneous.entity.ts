import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ObjectId,
} from 'typeorm';

@Entity('miscellaneous')
export class Miscellaneous {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  categoria!: string;

  @Column()
  valor!: string;

  @Column({ nullable: true })
  descripcion?: string;

  // ✅ Campos genéricos (se mantienen para compatibilidad de consultas)
  @Column({ nullable: true, type: 'string' })
  padreId?: ObjectId;

  @Column({ nullable: true })
  padreNombre?: string;

  // ✅ NUEVOS: Campos específicos de identificación jerárquica
  @Column({ nullable: true, type: 'string' })
  estadoId?: ObjectId;

  @Column({ nullable: true, type: 'string' })
  ciudadId?: ObjectId;

  @Column({ nullable: true, type: 'string' })
  categoriaId?: ObjectId;

  @Column({ nullable: true, type: 'string' })
  subcategoriaId?: ObjectId;

  @Column({ nullable: true, type: 'string' })
  causaId?: ObjectId;

  @Column({ nullable: true })
  tipoIncidencia?: string[];

  @Column({ nullable: true })
  nivelSeveridad?: string;

  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}