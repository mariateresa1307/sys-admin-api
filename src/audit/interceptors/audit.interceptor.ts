import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import { AuditAction } from '../../auth/entities/audit-log.entity';
import { getClientIp } from '../../utils/constants/get-client-ip';
import { JwtService } from '@nestjs/jwt';
import { AUDIT_MODULES } from '../../utils/constants/audit-modules';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly jwtService: JwtService,
  ) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, body, params, user, headers, url } = request;
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const module = this.extractModule(controller);
    const clientIp = getClientIp(request);
    const isLogout = handler === 'logout' || url.includes('/logout');
    const isLogin = handler === 'login' || url.includes('/login');
    const isUpdate = method === 'PUT' || method === 'PATCH';
    const isDelete = method === 'DELETE';

    let userEmail = user?.email;
    let userId = user?.sub || user?._id;

if ((isLogin || isLogout) && !userEmail) {
      userEmail = body?.email;
    }

    if (!userEmail || !userId) {
      try {
        const authHeader = headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const payload = this.jwtService.verify(token);
          if (!userEmail) userEmail = payload.email;
          if (!userId) userId = payload.sub || payload._id;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn('⚠️ [AuditInterceptor] Error extrayendo del token:', message);
      }
    }

     const hasIdentity = Boolean(userEmail || userId);
     
    return next.handle().pipe(
      tap(async (response) => {
        try {
          let action: AuditAction | null = null;

          if (isLogout) action = AuditAction.LOGOUT;
          else if (isLogin) action = AuditAction.LOGIN;
          else if (method === 'POST') action = AuditAction.CREATE;
          else if (isUpdate) action = AuditAction.UPDATE;
          else if (method === 'DELETE') action = AuditAction.DELETE;

          if (action && (user || isLogout || isLogin)) {
            const oldValue = (isUpdate || isDelete) ? (request as any).oldValue : undefined;
            console.log('🔍 [INTERCEPTOR] isDelete:', isDelete);
            console.log('🔍 [INTERCEPTOR] oldValue capturado:', oldValue);
            console.log('🔍 [INTERCEPTOR] request.oldValue:', (request as any).oldValue);

            let detailsMessage = '';
            let recordIdToSave = params?.id;

             if (isLogout) {
              detailsMessage = `Logout de usuario ${userEmail || 'desconocido'}`;
            } else if (isLogin) {

              detailsMessage = `Login de usuario ${userEmail || 'desconocido'}`;
            } else if (isUpdate && (module === 'TICKET' || module === 'TICKETS') && oldValue) {
              
              const caseNum = oldValue.caseNumber || 'S/N';
              const subj = oldValue.subject || 'Sin asunto';

              detailsMessage = `Actualización en TICKET: ${caseNum} - ${subj}`;
              recordIdToSave = caseNum;

            } else if (isUpdate && (module === 'USER' || module === 'USERS') && oldValue) {

              const email = oldValue.email || 'S/N';
              const name = `${oldValue.primerNombre || ''} ${oldValue.primerApellido || ''}`.trim() || 'Sin nombre';

              detailsMessage = `Actualización en USUARIO: ${email} - ${name}`;

            } else if (isUpdate && module === 'MISCELLANEOUS' && oldValue) {

              const cat = oldValue.categoria || 'S/N';
              const val = oldValue.valor || 'Sin valor';

              detailsMessage = `Actualización en MISCELLANEOUS: ${cat} - ${val}`;

            } else if (isUpdate && (module === 'SERVICE' || module === 'SERVICES') && oldValue) {

              const name = oldValue.name || oldValue.id_circuito || 'S/N';
              detailsMessage = `Actualización en SERVICIO: ${name}`;
            } else if (isDelete && oldValue) {
              const val = oldValue.valor || oldValue.name || oldValue.email || oldValue.subject || 'Registro';
              detailsMessage = `Eliminación en ${module}: ${val}`;
            } else {
              detailsMessage = `${action} en ${module}${params?.id ? ` (ID: ${params.id})` : ''}`;
            }

            const auditData = {
              userId: userId?.toString() || 'SYSTEM',
              userEmail: userEmail || 'anonymous',
              action,
              moduleId: module,
              recordId: recordIdToSave,
              oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
              newValue: (isLogin || isLogout)
                ? JSON.stringify({ action: isLogin ? 'login' : 'logout', user: userEmail })
                : JSON.stringify(body),
              ipAddress: clientIp,
              userAgent: headers['user-agent'],
              details: detailsMessage,
            };

            console.log('📤 [INTERCEPTOR] auditData.details:', auditData.details);
            console.log('📤 [INTERCEPTOR] auditData.recordId:', auditData.recordId);

            await this.auditService.createLog(auditData as any);
            console.log('✅ [INTERCEPTOR] Log creado exitosamente');
          }
        } catch (error) {
          this.logger.error('Error creating audit log', error);
        }
      }),
 catchError((error) => {
        if (isLogin) {
          const attemptedEmail = body?.email || 'desconocido';

          this.auditService
            .createLog({
              userId: 'SYSTEM',
              userEmail: attemptedEmail,
              action: AuditAction.LOGIN_FAILED,
              moduleId: AUDIT_MODULES.AUTH,
              ipAddress: clientIp,
              userAgent: headers['user-agent'],
              details: `Intento de login fallido: ${attemptedEmail}`,
            } as any)
            .catch((e) => this.logger.error('Error logging failed login', e));
        }
        return throwError(() => error);
      }),

    );
  }

  private extractModule(controllerName: string): string {
    const mapping: Record<string, string> = {
      UsersController: AUDIT_MODULES.USERS,
      TicketController: AUDIT_MODULES.TICKETS,
      TicketsController: AUDIT_MODULES.TICKETS,
      MiscellaneousController: AUDIT_MODULES.MISCELLANEOUS,
      ServicesController: AUDIT_MODULES.SERVICES,
      AuditController: AUDIT_MODULES.AUDIT,
      AuthController: AUDIT_MODULES.AUTH,
    };
    const module = mapping[controllerName] || controllerName.replace('Controller', '').toUpperCase();
    return module;
  }
}