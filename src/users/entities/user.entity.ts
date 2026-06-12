import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ObjectId,
} from 'typeorm';

@Entity('users')
export class User {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column({ unique: true })
  email!: string;

  @Column()
  clave!: string;

  @Column()
  primerNombre!: string;

  @Column({ nullable: true })
  segundoNombre?: string;

  @Column()
  primerApellido!: string;

  @Column({ nullable: true })
  segundoApellido?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ unique: true, nullable: true })
  username?: string;

  @Column({ default: 'admin' })
  role: string = 'admin';

  @Column({ default: true })
  isActive: boolean = true;
}