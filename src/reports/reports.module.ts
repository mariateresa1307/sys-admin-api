import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiscellaneousModule } from '../miscellaneous/miscellaneous.module';
import { Miscellaneous } from '../miscellaneous/entities/miscellaneous.entity';
import { TicketModule } from '../ticket/ticket.module';
import { Ticket } from '../ticket/entities/ticket.entity';
import { Service } from 'src/service/entities/service.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([Miscellaneous, Ticket, Service]),
    TicketModule,
    MiscellaneousModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
