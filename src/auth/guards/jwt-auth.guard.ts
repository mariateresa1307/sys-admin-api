import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    console.log('🔒 [JwtAuthGuard] canActivate - URL:', context.switchToHttp().getRequest().url);
    return super.canActivate(context);
  }

  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): any {
 /*   const request = context.switchToHttp().getRequest();
    console.log('👤 [JwtAuthGuard] handleRequest - URL:', request.url);
    console.log('👤 [JwtAuthGuard] User:', user ? '✅ EXISTE' : '❌ NO EXISTE');
    console.log('️ [JwtAuthGuard] Info:', info?.message || 'Sin info');*/
    
    if (err) {
      console.log(' [JwtAuthGuard] Error:', err.message);
    }
    
    if (!user) {
      throw err || new UnauthorizedException('No autenticado - Token inválido o expirado');
    }
    
    console.log('✅ [JwtAuthGuard] User autenticado:', user.email, 'Role:', user.role);
    return user;
  }
}