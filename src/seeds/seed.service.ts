import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MiscellaneousService } from '../miscellaneous/miscellaneous.service';

// Datos simples

type CiudadData = {
  estado: string;
  localidades: string[];
};

const CIUDADES_DATA: Record<string, CiudadData> = {
  CARACAS: {
    estado: "DISTRITO CAPITAL",
    localidades: [
      "Head End Los Naranjos", "Parque Central", "Torre Credi Card",
      "Cubo Negro", "Parque Cristal", "La Urbina", "El encantado",
      "Caricuao", "El Valle", "Manzanares", "Santa Mónica",
      "San Bernandino", "Mariches", "Valle Arriba", "El Paraíso",
      "Plaza las Américas"
    ]
  },
  ARAIRA: {
    estado: "MIRANDA",
    localidades: ["HUB Araira"]
  },
  "GUARENAS / GUARENAS": {
    estado: "MIRANDA",
    localidades: ["Head End Guatire", "CC Buena Aventura"]
  },
  VALENCIA: {
    estado: "CARABOBO",
    localidades: ["Head End Valencia", "Flor Amarillo", "San Diego", "Naguanagua", "Sambil"]
  },
  "PUERTO CABELLO": {
    estado: "CARABOBO",
    localidades: ["Head End Puerto Cabello"]
  },
  MARACAIBO: {
    estado: "ZULIA",
    localidades: ["Head End Maracaibo", "El Dividive"]
  },
  "SAN CRISTOBAL": {
    estado: "TACHIRA",
    localidades: ["Head End San Cristobal", "Las Vegas"]
  },
  MARACAY: {
    estado: "ARAGUA",
    localidades: ["HUB Site Maracay"]
  },
  "LA VICTORIA": {
    estado: "ARAGUA",
    localidades: ["Hub La Victoria"]
  },
  CARRIZAL: {
    estado: "",
    localidades: ["HUB Carrizal"]
  }
};

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
    const existingUser = await this.userService.findUserByEmail('test@example.com');

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
        descripcion: 'Cliente bancario con servicios financieros y conexiones dedicadas.',
        tipoSeveridad: 'ALTO',
      },
      {
        valor: 'CARRIER',
        tipoSeveridad: 'ALTO',
        descripcion: 'Proveedor de telecomunicaciones o red mayorista que ofrece conectividad a terceros.',
      },
      {
        valor: 'RESIDENCIAL',
        tipoSeveridad: 'BAJO',
        descripcion: 'Cliente particular de hogar con servicios de internet y entretenimiento.',
      },
      {
        valor: 'CORPORATIVO',
        tipoSeveridad: 'MEDIO',
        descripcion: 'Cliente empresarial con servicios corporativos y soporte especializado.',
      },
    ];

    console.log('🏢 Seeding tipos de cliente...');
    for (const tipoCliente of tipoClientes) {
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
        console.log(`   ⚠️  ${tipoCliente.valor} ya existe`);
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
        const estados = await this.miscellaneousService.findAll({ categoria: 'ESTADO' });
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
        const estadoId = ciudadData.estado ? estadosMap[ciudadData.estado] : undefined;
        
        const ciudad = await this.miscellaneousService.create({
          categoria: 'CIUDAD',
          valor: ciudadNombre,
          padreId: estadoId,
          padreNombre: ciudadData.estado || undefined,
          descripcion: ciudadData.estado ? `${ciudadNombre}, ${ciudadData.estado}` : ciudadNombre,
          activo: true,
        });
        
        ciudadesMap[ciudadNombre] = ciudad._id;
        console.log(`      ✓ Ciudad: ${ciudadNombre} ${ciudadData.estado ? `(${ciudadData.estado})` : ''}`);
      } catch (error) {
        console.log(`      ⚠️  Ciudad ${ciudadNombre} ya existe`);
        // Buscar la ciudad existente
        const ciudades = await this.miscellaneousService.findAll({ categoria: 'CIUDAD' });
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
        
        console.log(`      ✓ ${ciudadNombre}: ${ciudadData.localidades.length} localidades`);
      }
    }

    console.log(`   ✅ Total: ${Object.keys(estadosMap).length} estados, ${Object.keys(ciudadesMap).length} ciudades, ${totalLocalidades} localidades`);
  }
}