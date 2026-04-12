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
        userId: user.id,
        userEmail: user.email,
        action: AuditAction.LOGIN_FAILED,
        ipAddress,
        userAgent,
        details: 'passwordña inválida',
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      primerNombre: user.primerNombre,
      primerApellido: user.primerApellido,
    };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: '24h',
    });

    await this.createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: AuditAction.LOGIN,
      ipAddress,
      userAgent,
      details: 'Login exitoso',
    });

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        primerNombre: user.primerNombre,
        segundoNombre: user.segundoNombre,
        primerApellido: user.primerApellido,
        segundoApellido: user.segundoApellido,
      },
    };
  }

  private async createAuditLog(params: {
    userId?: string;
    userEmail: string;
    action: AuditAction;
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
