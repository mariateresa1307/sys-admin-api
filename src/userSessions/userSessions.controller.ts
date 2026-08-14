import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserSessionsService } from './userSessions.service';

@Controller('user-sessions')
@UseGuards(JwtAuthGuard)
export class UserSessionsController {
  constructor(private readonly sessionsService: UserSessionsService) {}

  @Post('heartbeat')
  async heartbeat(@Req() req: any) {
    const userId = String(req.user?._id ?? req.user?.sub ?? '');
    if (!userId) return { ok: false };
    await this.sessionsService.heartbeat(userId);
    return { ok: true };
  }

  @Get('online')
  async getOnlineUsers() {
    return this.sessionsService.getOnlineUsers();
  }
}