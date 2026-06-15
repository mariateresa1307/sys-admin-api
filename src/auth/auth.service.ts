import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { UsersService } from '../users/users.service';
import { ObjectId } from 'mongodb';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponseDto> {
    const user = await this.usersService.findUserByEmail(loginDto.email.toLowerCase());

    if (!user) {
      await this.createAuditLog({
        userEmail: loginDto.email,
        action: AuditAction.LOGIN_FAILED,
        ipAddress,
        userAgent,
        details: 'Usuario no encontrado',
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await this.usersService.validateUserPassword(loginDto.clave, user.clave);

    if (!isPasswordValid) {
      await this.createAuditLog({
        userId: user._id,
        userEmail: user.email,
        action: AuditAction.LOGIN_FAILED,
        ipAddress,
        userAgent,
        details: 'password invalid',
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user._id,
      email: user.email,
      primerNombre: user.primerNombre,
      primerApellido: user.primerApellido,
      role: user.role, 
    };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: '24h',
    });

    await this.createAuditLog({
      userId: user._id,
      userEmail: user.email,
      action: AuditAction.LOGIN,
      ipAddress,
      userAgent,
      details: 'Login exitoso',
    });

    return {
      access_token,
      user: {
        _id: user._id,
        email: user.email,
        primerNombre: user.primerNombre,
        segundoNombre: user.segundoNombre,
        primerApellido: user.primerApellido,
        segundoApellido: user.segundoApellido,
         role: user.role,
      },
    };
  }

  private async createAuditLog(params: {
    userId?: ObjectId;
    userEmail: string;
    action: AuditAction | string;
    ipAddress?: string;
    userAgent?: string;
    details?: string;
  }): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      userId: params.userId,
      userEmail: params.userEmail,
      action: params.action,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      details: params.details,
    });

    await this.auditLogRepository.save(auditLog);
  }
}
