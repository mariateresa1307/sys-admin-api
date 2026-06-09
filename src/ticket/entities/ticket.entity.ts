import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ObjectId,
} from 'typeorm';

@Entity('tickets')
export class Ticket {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  caseNumber!: string;

  @Column()
  incidentType!: string;

  @Column()
  subject!: string;

  @Column()
  networkCategory!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: 'open' })
  status: string = 'open';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
