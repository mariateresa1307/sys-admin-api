import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { UserSession } from './entity/userSession.entity';
import { UsersService } from '../users/users.service';

const ONLINE_THRESHOLD_MIN = 5;

@Injectable()
export class UserSessionsService {
  constructor(
    @InjectRepository(UserSession)
    private readonly sessionRepository: MongoRepository<UserSession>,
    private readonly usersService: UsersService,
  ) {}

  async heartbeat(userId: string) {
    const now = new Date();
    const existing = await this.sessionRepository.findOne({ where: { userId } as any });

    if (existing) {
      existing.lastHeartbeat = now;
      existing.isActive = true;
      return this.sessionRepository.save(existing);
    }

    const session = this.sessionRepository.create({
      userId,
      lastHeartbeat: now,
      isActive: true,
    });
    return this.sessionRepository.save(session);
  }

  async getOnlineUsers() {
    const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MIN * 60 * 1000);

    const sessions = await this.sessionRepository.find({
      where: { lastHeartbeat: { $gte: threshold }, isActive: true } as any,
      order: { lastHeartbeat: 'DESC' },
    });

    const users = await Promise.all(
      sessions.map(async (s) => {
        try {
          const user = await this.usersService.getUserById(s.userId);
          return {
            _id: user._id.toString(),
            username: user.username,
            email: user.email,
            primerNombre: user.primerNombre,
            primerApellido: user.primerApellido,
            role: user.role,
            lastHeartbeat: s.lastHeartbeat,
          };
        } catch {
          return null; // usuario eliminado: se ignora
        }
      }),
    );

    return users.filter((u) => u !== null);
  }

async getActiveUserIds(): Promise<string[]> {
    // Considerar activos a quienes tuvieron actividad en los últimos 10 minutos
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const sessions = await this.sessionRepository.find({
      where: { 
        lastHeartbeat: { $gte: tenMinutesAgo },
        isActive: true 
      } as any,
    });

    const uniqueIds = new Set(sessions.map(s => s.userId));
    return Array.from(uniqueIds);
  }
  

}