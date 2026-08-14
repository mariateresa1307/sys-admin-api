import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('user_sessions')
export class UserSession {
  @ObjectIdColumn() _id!: ObjectId;

  @Column() userId!: string;

  @Column()
  @Index({ expireAfterSeconds: 600 })
  lastHeartbeat!: Date;

  @Column({ default: true }) isActive!: boolean;

  @CreateDateColumn() createdAt!: Date;

  @UpdateDateColumn() updatedAt!: Date;
}