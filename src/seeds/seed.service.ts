import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MiscellaneousService } from '../miscellaneous/miscellaneous.service';
import { CATEGORIA } from 'src/utils/constants/Miscelanious.constants';

@Injectable()
export class SeedService {
  constructor(
    private readonly userService: UsersService,
    private readonly miscellaneousService: MiscellaneousService,
  ) {}

  async run() {
    console.log('🌱 Running seeds...');

    await this.createUserSeed();
    await this.tipoCliente();

    console.log('✅ Seeds completed!');
  }

  private async createUserSeed() {
    const existingUser =
      await this.userService.findUserByEmail('test@example.com');

    if (existingUser) {
      console.log('⚠️  Test user already exists, skipping...');
      return;
    }

    const hashedPassword = await bcrypt.hash('Test123!', 10);

    await this.userService.createUser({
      email: 'test@example.com',
      clave: hashedPassword,
      primerNombre: 'Juan',
      segundoNombre: 'Carlos',
      primerApellido: 'Pérez',
      segundoApellido: 'García',
      username: 'testuser',
      isActive: true,
    });

    console.log('👤 Test user created: test@example.com / Test123!');
  }

  private async tipoCliente() {
    const tipoClientes = [
      {
        valor: 'BANCA',
        descripcion:
          'Cliente bancario con servicios financieros y conexiones dedicadas.',
        tipoSeveridad: 'ALTO',
      },
      {
        valor: 'CARRIER',
        tipoSeveridad: 'ALTO',
        descripcion:
          'Proveedor de telecomunicaciones o red mayorista que ofrece conectividad a terceros.',
      },
      {
        valor: 'RESIDENCIAL',
        tipoSeveridad: 'BAJO',
        descripcion:
          'Cliente particular de hogar con servicios de internet y entretenimiento.',
      },
      {
        valor: 'CORPORATIVO',
        tipoSeveridad: 'MEDIO',
        descripcion:
          'Cliente empresarial con servicios corporativos y soporte especializado.',
      },
    ];

    for (const tipoCliente of tipoClientes) {
      await this.miscellaneousService.create({
        categoria: CATEGORIA.TIPO_CLIENTE,
        descripcion: tipoCliente.descripcion,
        activo: true,
        valor: tipoCliente.valor,
      });
    }
  }
}
