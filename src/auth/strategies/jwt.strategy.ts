import { Injectable, UnauthorizedException } from '@nestjs/common';
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
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret',
    });
  }

  async validate(payload: JwtPayload) {
  const user = await this.usersService.getUserById(payload.sub);
  if (!user) {
    throw new UnauthorizedException('Usuario no encontrado');
  }
  return {
    _id: user._id,
    email: user.email,
    primerNombre: user.primerNombre,
    primerApellido: user.primerApellido,
    role: user.role,
  };
}
}