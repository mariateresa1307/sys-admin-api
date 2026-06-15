import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core'; 
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuditLog } from './entities/audit-log.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from './guards/roles.guard';


@Module({
  imports: [
    ConfigModule,
    PassportModule,
    UsersModule,
    TypeOrmModule.forFeature([AuditLog]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret',
        signOptions: {
          expiresIn: '24h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    JwtStrategy,
  {
      provide: APP_GUARD, 
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
