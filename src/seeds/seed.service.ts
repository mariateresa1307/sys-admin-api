import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class SeedService {
  constructor(private readonly userService: UsersService) {}

  async run() {
    console.log('🌱 Running seeds...');

    await this.createUserSeed();

    console.log('✅ Seeds completed!');
  }

  private async createUserSeed() {
    const existingUser = await this.userService.findUserByEmail('test@example.com');

    if (existingUser) {
      console.log('⚠️  Test user already exists, skipping...');
      return;
    }

    const hashedPassword = await bcrypt.hash('Test123!', 10);

    await this.userService.createUser({
      correo: 'test@example.com',
      clave: hashedPassword,
      primerNombre: 'Juan',
      segundoNombre: 'Carlos',
      primerApellido: 'Pérez',
      segundoApellido: 'García',
    });

    console.log('👤 Test user created: test@example.com / Test123!');
  }
}
