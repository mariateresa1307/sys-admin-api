import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller'; 
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { Miscellaneous } from '../miscellaneous/entities/miscellaneous.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      User,
      AuditLog,
      Miscellaneous,
    ]),
    UsersModule, 
  ],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}