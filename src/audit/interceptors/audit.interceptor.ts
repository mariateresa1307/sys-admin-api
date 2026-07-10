// src/audit/interceptors/audit.interceptor.ts
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import { AuditAction } from '../../auth/entities/audit-log.entity';
import { getClientIp } from '../../utils/constants/get-client-ip';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, body, params, user, headers } = request;
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const module = this.extractModule(controller);
    const clientIp = getClientIp(request);

    // ✅ Logs detallados para diagnóstico
    console.log('═══════════════════════════════════════');
    console.log('🔍 [AuditInterceptor] === NUEVA PETICIÓN ===');
    console.log('🔍 [AuditInterceptor] Controller:', controller);
    console.log('🔍 [AuditInterceptor] Handler:', handler);
    console.log('🔍 [AuditInterceptor] Method:', method);
    console.log('🔍 [AuditInterceptor] URL:', request.url);
    console.log('🔍 [AuditInterceptor] Módulo extraído:', module);
    console.log('🔍 [AuditInterceptor] User:', user?.email || 'NO AUTENTICADO');
    console.log('🔍 [AuditInterceptor] IP:', clientIp);
    console.log('═══════════════════════════════════════');

    return next.handle().pipe(
      tap(async (response) => {
        try {
          let action: AuditAction | null = null;

          if (method === 'POST') action = AuditAction.CREATE;
          else if (method === 'PUT' || method === 'PATCH') action = AuditAction.UPDATE;
          else if (method === 'DELETE') action = AuditAction.DELETE;

          // ✅ Solo crear log si hay acción y usuario autenticado
          if (action && user) {
            const auditData = {
              userId: user.sub?.toString(),
              userEmail: user.email,
              action,
              moduleId: module, // ✅ Campo moduleId
              recordId: params.id,
              oldValue: (method === 'PUT' || method === 'PATCH') && request.oldValue
                ? JSON.stringify(request.oldValue)
                : undefined,
              newValue: JSON.stringify(body),
              ipAddress: clientIp,
              userAgent: headers['user-agent'],
              details: `${action} en ${module}${params.id ? ` (ID: ${params.id})` : ''}`,
            };

            console.log('📤 [AuditInterceptor] Creando log de auditoría:');
            console.log('  - Action:', auditData.action);
            console.log('  - ModuleId:', auditData.moduleId);
            console.log('  - User:', auditData.userEmail);
            console.log('  - IP:', auditData.ipAddress);

            const result = await this.auditService.createLog(auditData as any);
            
            console.log('✅ [AuditInterceptor] Log creado exitosamente:', result._id);
          } else {
            if (!action) {
              console.log('⚠️ [AuditInterceptor] No se registrará: Método no es CREATE/UPDATE/DELETE');
            }
            if (!user) {
              console.log('⚠️ [AuditInterceptor] No se registrará: Usuario no autenticado');
            }
          }
        } catch (error) {
          console.error('❌ [AuditInterceptor] Error creating audit log:', error);
        }
      }),
    );
  }

  private extractModule(controllerName: string): string {
    const mapping: Record<string, string> = {
      UsersController: 'USERS',
      TicketsController: 'TICKETS',
      MiscellaneousController: 'MISCELLANEOUS',
      ServicesController: 'SERVICES',
      AuditController: 'AUDIT',
      AuthController: 'AUTH',
    };
    
    const module = mapping[controllerName] || controllerName.replace('Controller', '').toUpperCase();
    console.log(`🔍 [extractModule] ${controllerName} → ${module}`);
    return module;
  }
}