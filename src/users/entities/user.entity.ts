import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  clave: string;

  @Column({ name: 'primer_nombre' })
  primerNombre: string;

  @Column({ name: 'segundo_nombre', nullable: true })
  segundoNombre?: string;

  @Column({ name: 'primer_apellido' })
  primerApellido: string;

  @Column({ name: 'segundo_apellido', nullable: true })
  segundoApellido?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
