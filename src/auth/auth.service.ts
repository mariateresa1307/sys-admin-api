import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { UsersService } from '../users/users.service';
import { ObjectId } from 'mongodb';
import { AUDIT_MODULES } from '../utils/constants/audit-modules';
import { NotificationsService } from '../notifications/notifications.service';
import { TicketService } from '../ticket/ticket.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly ticketService: TicketService, 
    private readonly notificationsService: NotificationsService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: MongoRepository<AuditLog>,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponseDto> {
    const user = await this.usersService.findUserByEmail(
      loginDto.email.toLowerCase(),
    );

    if (!user) {
      await this.createAuditLog({
      
        userEmail: loginDto.email,
        action: AuditAction.LOGIN_FAILED,
         moduleId: AUDIT_MODULES.AUTH,
        ipAddress,
        userAgent,
        details: 'Usuario no encontrado',
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await this.usersService.validateUserPassword(
      loginDto.clave,
      user.clave,
    );

    if (!isPasswordValid) {
      await this.createAuditLog({
        userId: user._id,
        userEmail: user.email,
        action: AuditAction.LOGIN_FAILED,
        ipAddress,
        userAgent,
        details: 'password invalid',
          moduleId: AUDIT_MODULES.AUTH, 
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
      moduleId: AUDIT_MODULES.AUTH,
      
    });
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const criticalTickets = await this.ticketService.findDelayedTickets(oneHourAgo);

      if (criticalTickets && criticalTickets.length > 0) {
        await this.notificationsService.createNotification({
          userId: user._id.toString(),
          title: `⚠️ Atención: ${criticalTickets.length} ticket(s) requieren revisión`,
          message: `Al iniciar sesión, detectamos ${criticalTickets.length} ticket(s) sin actualizar por más de 1 hora.`,
          type: 'login_alert',
          ticketNumber: criticalTickets[0].caseNumber || 'N/A',
        });
      }
    } catch (error) {
      console.error('Error verificando tickets al login:', error);
      // No lanzamos el error para no interrumpir el flujo de login
    }

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
    moduleId?: string;
  }): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      userId: params.userId,
      userEmail: params.userEmail,
      action: params.action,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      details: params.details,
      moduleId: params.moduleId,
      
    });

    await this.auditLogRepository.save(auditLog);
  }
}
