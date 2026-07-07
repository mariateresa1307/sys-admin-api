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

    const estadosMap = new Map<string, string>();

    for (const estadoNombre of Array.from(estadosUnicos)) {
      try {
        const estado = await this.miscellaneousService.create({
          categoria: 'ESTADO',
          valor: estadoNombre,
          descripcion: `Estado ${estadoNombre}`,
          activo: true,
        });
        estadosMap.set(estadoNombre, estado._id.toString());
        console.log(`      ✓ Estado: ${estadoNombre}`);
      } catch (error) {
        console.log(`      ⚠️  Estado ${estadoNombre} ya existe`);
        // Buscar el estado existente
        const estados = await this.miscellaneousService.findAll({
          categoria: 'ESTADO',
        });
        const existente = estados.find((e: any) => e.valor === estadoNombre);
        if (existente) {
          estadosMap.set(estadoNombre, existente._id.toString());
        }
      }
    }

    // Paso 2: Crear ciudades
    console.log('   🏙️  Paso 2: Creando ciudades...');
    const ciudadesMap = new Map<string, string>();

    for (const [ciudadNombre, ciudadData] of Object.entries(CIUDADES_DATA)) {
      try {
        const estadoId = ciudadData.estado
          ? estadosMap.get(ciudadData.estado)

          : undefined;

        const ciudad = await this.miscellaneousService.create({
          categoria: 'CIUDAD',
          valor: ciudadNombre,
          estadoId: estadoId, 
          padreNombre: ciudadData.estado || undefined,
          descripcion: ciudadData.estado
            ? `${ciudadNombre}, ${ciudadData.estado}`
            : ciudadNombre,
          activo: true,
        });

       ciudadesMap.set(ciudadNombre, ciudad._id.toString());
        console.log(`      ✓ Ciudad: ${ciudadNombre} ${ciudadData.estado ? `(${ciudadData.estado})` : ''}`);
      } catch (error) {
        console.log(`      ⚠️  Ciudad ${ciudadNombre} ya existe`);
        // Buscar la ciudad existente
        const ciudades = await this.miscellaneousService.findAll({
          categoria: 'CIUDAD',
        });
        const existente = ciudades.find((c: any) => c.valor === ciudadNombre);
        if (existente) {
          ciudadesMap.set(ciudadNombre, existente._id.toString());
        }
      }
    }

    // Paso 3: Crear localidades
    console.log('   📍 Paso 3: Creando localidades...');
    let totalLocalidades = 0;

    for (const [ciudadNombre, ciudadData] of Object.entries(CIUDADES_DATA)) {
      if (ciudadData.localidades && ciudadData.localidades.length > 0) {
        const ciudadId = ciudadesMap.get(ciudadNombre);
        if (!ciudadId) {
          console.log(`      ⚠️  No se pudo crear localidades para ${ciudadNombre}: ciudad no encontrada`);
          continue;
        }

      // ✅ Crear localidades en paralelo para esta ciudad
        const localidadesPromises = ciudadData.localidades.map(async (localidadNombre) => {
          try {
            await this.miscellaneousService.create({
              categoria: 'LOCALIDAD',
              valor: localidadNombre,
              ciudadId: ciudadId, // ✅ Campo específico que espera el backend
              descripcion: `${localidadNombre}, ${ciudadNombre}`,
              activo: true,
            });
            return true;
          } catch (error) {
            // La localidad ya existe, ignorar
            return false;
          }
        });

        const results = await Promise.all(localidadesPromises);
        const creadas = results.filter(r => r).length;
        totalLocalidades += creadas;

        console.log(`      ✓ ${ciudadNombre}: ${creadas}/${ciudadData.localidades.length} localidades`);
      }
    }
    console.log(
      `   ✅ Total: ${Object.keys(estadosMap).length} estados, ${Object.keys(ciudadesMap).length} ciudades, ${totalLocalidades} localidades`,
    );
  }
}
