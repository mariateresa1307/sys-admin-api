import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    console.log('🔒 [JwtAuthGuard] canActivate - URL:', request.url);
    console.log('🔒 [JwtAuthGuard] Authorization header:', authHeader ? `${authHeader.substring(0, 30)}...` : 'NO PRESENTE');
    
    return super.canActivate(context);
  }

  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): any {
    const request = context.switchToHttp().getRequest();
    
    // ✅ SIEMPRE mostrar logs, incluso cuando falla
    console.log('👤 [JwtAuthGuard] handleRequest - URL:', request.url);
    console.log('👤 [JwtAuthGuard] User:', user ? `✅ ${user.email}` : '❌ NO EXISTE');
    console.log('ℹ️ [JwtAuthGuard] Info:', info?.message || 'Sin info');
    
    if (err) {
      console.error(' [JwtAuthGuard] Error:', err.message);
      console.error(' [JwtAuthGuard] Error stack:', err.stack);
    }
    
    if (info) {
      console.log('ℹ️ [JwtAuthGuard] Info details:', info);
    }
    
    if (err || !user) {
      const errorMessage = err?.message || info?.message || 'No autenticado';
      console.error('❌ [JwtAuthGuard] Rechazando acceso:', errorMessage);
      throw err || new UnauthorizedException(errorMessage);
    }
    
    console.log('✅ [JwtAuthGuard] User autenticado:', user.email, 'Role:', user.role);
    return user;
  }
}