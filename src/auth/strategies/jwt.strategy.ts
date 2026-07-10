import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  primerNombre: string;
  primerApellido: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_SECRET') || 'default-secret';
    
    console.log('🔐 [JwtStrategy] Inicializando con secret:', secret.substring(0, 10) + '...');
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    console.log('🔍 [JwtStrategy] validate() llamado con payload:', {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A',
    });

    if (!payload.sub) {
      console.error('❌ [JwtStrategy] Payload no tiene sub');
      throw new UnauthorizedException('Token inválido: falta sub');
    }

    try {
      const user = await this.usersService.getUserById(payload.sub);
      
      if (!user) {
        console.error('❌ [JwtStrategy] Usuario no encontrado para ID:', payload.sub);
        throw new UnauthorizedException('Usuario no encontrado');
      }

      console.log('✅ [JwtStrategy] Usuario validado:', user.email, 'Role:', user.role);
      
      return {
        _id: user._id,
        email: user.email,
        primerNombre: user.primerNombre,
        primerApellido: user.primerApellido,
        role: user.role,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ [JwtStrategy] Error validando usuario:', message);
      
      // Si es UnauthorizedException, la relanzamos
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Para otros errores (como NotFoundException), lanzamos UnauthorizedException
      throw new UnauthorizedException('Error al validar usuario: ' + message);
    }
  }
}