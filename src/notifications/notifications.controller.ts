// src/notifications/notifications.controller.ts
import { Controller, Get, Post, Param, UseGuards, Req, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  async createNotification(@Req() req: any, @Body() body: any) {
    const userId = req.user._id || req.user.sub;
    console.log('📥 [POST] Creando notificación. UserId del token:', userId);
    
    return this.notificationsService.createNotification({
      userId: body.userId || userId,
      title: body.title,
      message: body.message,
      type: body.type || 'manual',
      ticketId: body.ticketId,
      ticketNumber: body.ticketNumber,
    });
  }

  @Get()
  async getNotifications(@Req() req: any) {
    const userId = req.user._id || req.user.sub;
    console.log('📥 [GET] Solicitando notificaciones. UserId del token:', userId, typeof userId);
    
    const notifications = await this.notificationsService.getUserNotifications(userId);
    return notifications;
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user._id || req.user.sub;
    console.log('📥 [GET COUNT] Contando no leídas. UserId del token:', userId);
    
    const count = await this.notificationsService.countUnread(userId);
    return { count };
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string) {
    await this.notificationsService.markAsRead(id);
    return { success: true };
  }

  @Post('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user._id || req.user.sub;
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }
}