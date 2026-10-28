import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { AuditLog } from './auth/entities/audit-log.entity';
import { ServicesModule } from './service/service.module';
import { Service } from './service/entities/service.entity';
import { TicketModule } from './ticket/ticket.module';
import { Ticket } from './ticket/entities/ticket.entity';
import { MiscellaneousModule } from './miscellaneous/miscellaneous.module';
import { Miscellaneous } from './miscellaneous/entities/miscellaneous.entity';
import { ReportsModule } from './reports/reports.module';
import { AuditInterceptor } from './audit/interceptors/audit.interceptor';
import { JwtModule } from '@nestjs/jwt';
import { UserSessionsModule } from './userSessions/userSessions.module';
import { UserSession } from './userSessions/entity/userSession.entity'; // ✅ NUEVO: la ENTIDAD
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { Notification } from './notifications/entities/notification.entity';

@Module({
  imports: [
    JwtModule,
    ScheduleModule.forRoot(), 
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'mongodb',
        url: configService.get<string>('MONGO_URI'),
        entities: [User, AuditLog, Service, Ticket, Miscellaneous, UserSession, Notification],
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    AuditModule,
    UsersModule,
    ServicesModule,
    TicketModule,
    MiscellaneousModule,
    ReportsModule,
    UserSessionsModule, 
     NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
  
  ],
})
export class AppModule {}