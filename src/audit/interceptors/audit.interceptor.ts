// src/audit/interceptors/audit.interceptor.ts
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import { AuditAction } from '../../auth/entities/audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, body, params, user, ip, headers } = request;
    const controller = context.getClass().name;
    const module = this.extractModule(controller);

    return next.handle().pipe(
      tap(async (response) => {
        try {
          let action: AuditAction | null = null;

          if (method === 'POST') action = AuditAction.CREATE;
          else if (method === 'PUT' || method === 'PATCH') action = AuditAction.UPDATE;
          else if (method === 'DELETE') action = AuditAction.DELETE;

          if (action && user) {
            await this.auditService.createLog({
              userId: user.sub?.toString(),
              userEmail: user.email,
              action,
              moduleId: module, // ✅ Usar moduleId en lugar de module
              recordId: params.id,
              oldValue: (method === 'PUT' || method === 'PATCH') && request.oldValue 
                ? JSON.stringify(request.oldValue) 
                : undefined,
              newValue: JSON.stringify(body),
              ipAddress: ip || headers['x-forwarded-for'],
              userAgent: headers['user-agent'],
              details: `${action} en ${module}${params.id ? ` (ID: ${params.id})` : ''}`,
            } as any);
          }
        } catch (error) {
          console.error('Error creating audit log:', error);
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
    };
    return mapping[controllerName] || controllerName.replace('Controller', '').toUpperCase();
  }
}