import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { UserSessionsModule } from '../userSessions/userSessions.module';
import { TicketModule } from '../ticket/ticket.module';
import { UsersModule } from '../users/users.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    UserSessionsModule,
    forwardRef(() => TicketModule),
    forwardRef(() => UsersModule), // ✅ Agregado forwardRef por seguridad
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}