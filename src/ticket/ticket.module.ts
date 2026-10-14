import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt'; // ✅ 1. AGREGADO: Necesario para que el interceptor resuelva JwtService

import { Ticket } from './entities/ticket.entity';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller'; 
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { Miscellaneous } from '../miscellaneous/entities/miscellaneous.entity';
import { Service } from '../service/entities/service.entity'; 

import { UsersModule } from '../users/users.module';
import { UserSessionsModule } from '../userSessions/userSessions.module'; 
import { NotificationsModule } from '../notifications/notifications.module'; 
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      User,
      AuditLog,
      Miscellaneous,
      Service,
      // ❌ ELIMINADO: AuditModule no es una entidad, no va aquí
    ]),
    UsersModule, 
    UserSessionsModule,
    forwardRef(() => NotificationsModule),
    AuditModule, // ✅ 2. CORREGIDO: Importado como módulo independiente
    JwtModule,   // ✅ 3. AGREGADO: Proporciona JwtService al AuditInterceptor
  ],
  controllers: [TicketController],
  providers: [
    TicketService,
    // ❌ ELIMINADO: AuditService no va aquí, ya lo provee y exporta AuditModule
  ],
  exports: [TicketService],
})
export class TicketModule {}