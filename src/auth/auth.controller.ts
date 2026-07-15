import {  Controller, Post, Body, Headers, Request, HttpCode, HttpStatus, UseGuards} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';
import { JwtAuthGuard } from './guards/jwt-auth.guard';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Headers('x-forwarded-for') xForwardedFor?: string,
    @Headers('user-agent') userAgent?: string,
    @Request() req?: any,
  ): Promise<LoginResponseDto> {
    const ipAddress =
      xForwardedFor?.split(',')[0].trim() ||
      req?.ip ||
      req?.connection?.remoteAddress;

    return this.authService.login(loginDto, ipAddress, userAgent);
  }

    @Post('logout')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  async logout(@Request() req: ExpressRequest) {
    return { message: 'Logout exitoso' };
  
}
}

function UseInterceptors(interceptor: typeof AuditInterceptor) {
  return (
    target: AuthController,
    propertyKey: "logout",
    descriptor: TypedPropertyDescriptor<(req: any) => Promise<{ message: string; }>>
  ) => {
    if (descriptor?.value) {
      (descriptor.value as any).__interceptor = interceptor;
    }
    return descriptor;
  };
}
