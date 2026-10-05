import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { UserSessionsService } from '../userSessions/userSessions.service';
import { TicketService } from '../ticket/ticket.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from '../users/users.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: MongoRepository<Notification>,
    private readonly userSessionsService: UserSessionsService,
    private readonly ticketsService: TicketService,
    private readonly usersService: UsersService,
  ) {}

  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    ticketId?: string;
    ticketNumber?: string;
  }): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...data,
      read: false,
    });
    const saved = await this.notificationRepository.save(notification);
    return saved;
  }

  async notifyActiveUsers(data: {
    title: string;
    message: string;
    type: string;
    ticketId?: string;
    ticketNumber?: string;
  }): Promise<number> {
    const activeUserIds = await this.userSessionsService.getActiveUserIds();
    let notificationsCreated = 0;
    
    for (const userId of activeUserIds) {
      await this.createNotification({ userId, ...data });
      notificationsCreated++;
    }

    this.logger.log(`🔔 Notificación enviada a ${notificationsCreated} usuarios activos`);
    return notificationsCreated;
  }

  async getUserNotifications(userId: string, limit: number = 50) {
    return await this.notificationRepository.find({
      where: { userId: String(userId) },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markAsRead(notificationId: string) {
    return await this.notificationRepository.delete({ _id: notificationId } as any);
  }

  async markAllAsRead(userId: string) {
    return await this.notificationRepository.delete({ userId: String(userId) });
  }

  async countUnread(userId: string) {
    const unreadNotifications = await this.notificationRepository.find({
      where: { userId: String(userId), read: false },
    });
    return unreadNotifications.length;
  }

  // ✅ NUEVO: Crear notificación de cierre de ticket
  async notifyTicketClosure(ticket: any, userId: string) {
    await this.createNotification({
      userId,
      title: '✅ Ticket cerrado exitosamente',
      message: `El ticket ${ticket.caseNumber} ha sido cerrado correctamente.`,
      type: 'ticket_closure',
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.caseNumber,
    });
    this.logger.log(`🔔 Notificación de cierre enviada para ticket ${ticket.caseNumber}`);
  }

  // ✅ NUEVO: Crear notificación de asignación manual
  async notifyManualAssignment(ticket: any, assignedUserId: string, assignedBy: string) {
    await this.createNotification({
      userId: assignedUserId,
      title: '🎫 Nuevo ticket asignado',
      message: `Se te ha asignado el ticket ${ticket.caseNumber}.`,
      type: 'ticket_assignment',
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.caseNumber,
    });
    this.logger.log(`🔔 Notificación de asignación manual enviada para ticket ${ticket.caseNumber}`);
  }

// ✅ NUEVO: Crear notificación de resumen al iniciar sesión
async notifyLoginSummary(userId: string) {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const staleTickets = await this.ticketsService.findDelayedTickets(twoHoursAgo);

    if (staleTickets.length > 0) {
      // ✅ Extraer los números de caso de los tickets
      const ticketNumbers = staleTickets.map(t => t.caseNumber).join(', ');
      
      await this.createNotification({
        userId,
        title: `⚠️ ${staleTickets.length} ticket(s) sin actualización`,
        message: `Al iniciar sesión, detectamos ${staleTickets.length} ticket(s) con más de 2 horas sin avances: ${ticketNumbers}`,
        type: 'login_stale_alert',
        ticketNumber: staleTickets[0].caseNumber,
      });

      this.logger.log(`🔔 Notificación de ${staleTickets.length} tickets stale enviada al login: ${ticketNumbers}`);
    }
  } catch (error) {
    this.logger.error('Error creando notificación de login:', error);
  }
}

  // ==========================================
  // CRON JOBS
  // ==========================================

  @Cron('*/5 * * * *') 
  async cleanupOldReadNotifications() {
    this.logger.log('🧹 [CRON] Limpiando notificaciones leídas antiguas...');
    
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    try {
      const result = await this.notificationRepository.delete({
        read: true,
        createdAt: { $lt: fifteenMinutesAgo }
      } as any);
      
      const deletedCount = (result as any).deletedCount || (result as any).affected || 0;
      
      if (deletedCount > 0) {
        this.logger.log(`✅ [CRON] Se eliminaron ${deletedCount} notificaciones antiguas`);
      }
    } catch (error) {
      this.logger.error(' Error limpiando notificaciones antiguas:', error);
    }
  }

  @Cron('*/10 * * * *') // Cada 10 minutos
  async checkAndNotifyStaleTickets() {
    this.logger.log('🔍 [CRON] Iniciando verificación de tickets...');

    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    try {
      // 1️⃣ TICKETS SIN ASIGNAR POR 4 HORAS → Asignar automáticamente
      const unassignedStaleTickets = await this.ticketsService.findUnassignedStaleTickets(fourHoursAgo);
      
      for (const ticket of unassignedStaleTickets) {
        const assignedOperator = await this.ticketsService.getLeastLoadedOperator();
        
        if (assignedOperator) {
          await this.ticketsService.updateTicket(ticket._id.toString(), {
            operatorAsignado: assignedOperator._id.toString(),
          } as any);

          await this.createNotification({
            userId: assignedOperator._id.toString(),
            title: '🎫 Ticket asignado automáticamente',
            message: `Se te asignó el ticket ${ticket.caseNumber} por inactividad de 4+ horas.`,
            type: 'ticket_auto_assignment',
            ticketId: ticket._id.toString(),
            ticketNumber: ticket.caseNumber,
          });

          this.logger.log(`✅ Ticket ${ticket.caseNumber} asignado automáticamente a ${assignedOperator.email}`);
        }
      }

      // 2️⃣ TICKETS ASIGNADOS SIN ACTUALIZAR POR 2 HORAS → Alerta a todos los activos
      const delayedTickets = await this.ticketsService.findDelayedTickets(twoHoursAgo);
      
      for (const ticket of delayedTickets) {
        const existingAlert = await this.notificationRepository.findOne({
          where: {
            ticketId: ticket._id.toString(),
            type: 'ticket_delay_alert',
            createdAt: { $gte: twoHoursAgo }
          }
        } as any);

        if (!existingAlert) {
          await this.notifyActiveUsers({
            title: '⚠️ Ticket sin actualizar',
            message: `El ticket ${ticket.caseNumber} lleva más de 2 horas sin actualización`,
            type: 'ticket_delay_alert',
            ticketId: ticket._id.toString(),
            ticketNumber: ticket.caseNumber,
          });
          this.logger.log(`⚠️ Alerta enviada por ticket ${ticket.caseNumber}`);
        }
      }

      this.logger.log(`✅ [CRON] Verificación completada`);

    } catch (error) {
      this.logger.error('❌ Error en CRON de tickets:', error);
    }
  }

  private async assignTicketAutomatically(ticket: any): Promise<any> {
    return null;
  }

  private async getLeastLoadedOperator(): Promise<any> {
    return null;
  }
}