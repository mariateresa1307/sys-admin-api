import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { UsersModule } from '../users/users.module';
import { SeedService } from './seed.service';
import { MiscellaneousModule } from 'src/miscellaneous/miscellaneous.module';
import { Miscellaneous } from 'src/miscellaneous/entities/miscellaneous.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mongodb',
        url: configService.get<string>('MONGO_URI'),
        entities: [User, AuditLog, Miscellaneous],
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true),
        logging: configService.get<boolean>('DB_LOGGING', false),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    MiscellaneousModule,
  ],
  providers: [SeedService],
})
export class SeedsModule {}
