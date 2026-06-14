// src/miscellaneous/entities/miscellaneous.entity.ts
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

  @Column({ nullable: true, type: 'string' })
  padreId?: ObjectId;

  @Column({ nullable: true })
  padreNombre?: string;

  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  tipoIncidencia?: string;
}
