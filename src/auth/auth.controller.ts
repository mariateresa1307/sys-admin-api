import {
  Controller,
  Post,
  Body,
  Headers,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

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
}
