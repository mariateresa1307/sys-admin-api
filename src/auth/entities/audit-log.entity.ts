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

  @Column({ type: 'objectId' as any, nullable: true })
  userId?: ObjectId;

  @Column({ nullable: true })
  userEmail?: string;

  @Column({ nullable: false })
  action: string;

  @Column({ nullable: true })
  moduleId?: string;

  @Column({ type: 'text', nullable: true })
  oldValue?: string;

  @Column({ type: 'text', nullable: true })
  newValue?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  macAddress?: string;

  @Column({ nullable: true })
  sourceApplication?: string;

  @Column({ nullable: true, type: 'timestamp' as any })
  eventDate?: Date;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'text', nullable: true })
  details?: string;

  @CreateDateColumn()
  createdAt: Date;
}
