// src/notifications/entities/notification.entity.ts
import { Entity, ObjectIdColumn, ObjectId, Column, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @ObjectIdColumn()
  _id!: ObjectId;

 @Column({ type: 'string' }) 
  userId!: string; 

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  message?: string;

  @Column({ nullable: true })
  type?: string; 

  @Column({ nullable: true })
  ticketId?: string;

  @Column({ nullable: true })
  ticketNumber?: string;

  @Column({ type: 'boolean', default: false })
  read?: boolean;

  @CreateDateColumn()
  createdAt?: Date;
}