import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  ObjectId,
} from 'typeorm';

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
}

@Entity('audit_logs')
export class AuditLog {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ type: 'objectId' as any, nullable: false })
  userId?: ObjectId;

  @Column({ nullable: true })
  userEmail?: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'text', nullable: true })
  details?: string;

  @CreateDateColumn()
  createdAt: Date;
}
