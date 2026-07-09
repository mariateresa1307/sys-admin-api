import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, User]), UsersModule],
  providers: [TicketService],
  controllers: [TicketController],
  exports: [TicketService, TypeOrmModule],
})
export class TicketsModule {}
