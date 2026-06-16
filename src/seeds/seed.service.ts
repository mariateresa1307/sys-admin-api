import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MiscellaneousService } from '../miscellaneous/miscellaneous.service';
import { CIUDADES_DATA } from './dbSeed/localidades';
import { TIPO_CLIENTES } from './dbSeed/tipoCliente';

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
    await this.seedEstadosCiudadesLocalidades();

    console.log('✅ Seeds completed!');
  }

  private async createUserSeed() {
    const existingUser =
      await this.userService.findUserByEmail('test@example.com');

    if (existingUser) {
      console.log('⚠️  Test user already exists, skipping...');
      return;
    }

    await this.userService.createUser({
      email: 'test@example.com',
      clave: 'Test123!',
      primerNombre: 'Juan',
      segundoNombre: 'Carlos',
      primerApellido: 'Pérez',
      segundoApellido: 'García',
      username: 'testuser',
      isActive: true,
      role: 'admin',
    });

    console.log('👤 Test user created: test@example.com / Test123!');
  }

  private async tipoCliente() {
    console.log('🏢 Seeding tipos de cliente...');
    for (const tipoCliente of TIPO_CLIENTES) {
      try {
        await this.miscellaneousService.create({
          categoria: 'TIPO_CLIENTE',
          descripcion: tipoCliente.descripcion,
          activo: true,
          valor: tipoCliente.valor,
          nivelSeveridad: tipoCliente.tipoSeveridad,
        });
        console.log(`   ✓ Tipo cliente creado: ${tipoCliente.valor}`);
      } catch (error) {
        console.log(`   ⚠️  ${tipoCliente.valor} ya existe`, error);
      }
    }
  }

  private async seedEstadosCiudadesLocalidades() {
    console.log('🏙️  Seeding Estados, Ciudades y Localidades...');

    // Paso 1: Crear estados únicos
    console.log('   📍 Paso 1: Creando estados...');
    const estadosUnicos = new Set<string>();

    for (const ciudadData of Object.values(CIUDADES_DATA)) {
      if (ciudadData.estado && ciudadData.estado.trim() !== '') {
        estadosUnicos.add(ciudadData.estado);
      }
    }

    const estadosMap: any = {};

    for (const estadoNombre of Array.from(estadosUnicos)) {
      try {
        const estado = await this.miscellaneousService.create({
          categoria: 'ESTADO',
          valor: estadoNombre,
          descripcion: `Estado ${estadoNombre}`,
          activo: true,
        });
        estadosMap[estadoNombre] = estado._id;
        console.log(`      ✓ Estado: ${estadoNombre}`);
      } catch (error) {
        console.log(`      ⚠️  Estado ${estadoNombre} ya existe`);
        // Buscar el estado existente
        const estados = await this.miscellaneousService.findAll({
          categoria: 'ESTADO',
        });
        const existente = estados.find((e: any) => e.valor === estadoNombre);
        if (existente) {
          estadosMap[estadoNombre] = existente._id;
        }
      }
    }

    // Paso 2: Crear ciudades
    console.log('   🏙️  Paso 2: Creando ciudades...');
    const ciudadesMap: any = {};

    for (const [ciudadNombre, ciudadData] of Object.entries(CIUDADES_DATA)) {
      try {
        const estadoId = ciudadData.estado
          ? estadosMap[ciudadData.estado]
          : undefined;

        const ciudad = await this.miscellaneousService.create({
          categoria: 'CIUDAD',
          valor: ciudadNombre,
          padreId: estadoId,
          padreNombre: ciudadData.estado || undefined,
          descripcion: ciudadData.estado
            ? `${ciudadNombre}, ${ciudadData.estado}`
            : ciudadNombre,
          activo: true,
        });

        ciudadesMap[ciudadNombre] = ciudad._id;
        console.log(
          `      ✓ Ciudad: ${ciudadNombre} ${ciudadData.estado ? `(${ciudadData.estado})` : ''}`,
        );
      } catch (error) {
        console.log(`      ⚠️  Ciudad ${ciudadNombre} ya existe`);
        // Buscar la ciudad existente
        const ciudades = await this.miscellaneousService.findAll({
          categoria: 'CIUDAD',
        });
        const existente = ciudades.find((c: any) => c.valor === ciudadNombre);
        if (existente) {
          ciudadesMap[ciudadNombre] = existente._id;
        }
      }
    }

    // Paso 3: Crear localidades
    console.log('   📍 Paso 3: Creando localidades...');
    let totalLocalidades = 0;

    for (const [ciudadNombre, ciudadData] of Object.entries(CIUDADES_DATA)) {
      if (ciudadData.localidades && ciudadData.localidades.length > 0) {
        const ciudadId = ciudadesMap[ciudadNombre];

        for (const localidadNombre of ciudadData.localidades) {
          try {
            await this.miscellaneousService.create({
              categoria: 'LOCALIDAD',
              valor: localidadNombre,
              padreId: ciudadId,
              padreNombre: ciudadNombre,
              descripcion: `${localidadNombre}, ${ciudadNombre}`,
              activo: true,
            });
            totalLocalidades++;
          } catch (error) {
            // La localidad ya existe, ignorar
          }
        }

        console.log(
          `      ✓ ${ciudadNombre}: ${ciudadData.localidades.length} localidades`,
        );
      }
    }

    console.log(
      `   ✅ Total: ${Object.keys(estadosMap).length} estados, ${Object.keys(ciudadesMap).length} ciudades, ${totalLocalidades} localidades`,
    );
  }
}
