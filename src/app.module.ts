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
import { TicketsModule } from './ticket/ticket.module';
import { Ticket } from './ticket/entities/ticket.entity';
import { MiscellaneousModule } from './miscellaneous/miscellaneous.module';
import { Miscellaneous } from './miscellaneous/entities/miscellaneous.entity';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './audit/interceptors/audit.interceptor';
import { JwtModule } from '@nestjs/jwt'; 


@Module({
  imports: [
     JwtModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'mongodb',
        url: configService.get<string>('MONGO_URI'),
        entities: [User, AuditLog, Service, Ticket,Miscellaneous],
        synchronize: true, 
       
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    AuditModule,
    UsersModule,
    ServicesModule,
    TicketsModule,
    MiscellaneousModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
