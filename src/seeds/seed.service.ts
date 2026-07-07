import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { MiscellaneousService } from '../miscellaneous/miscellaneous.service';
import { CIUDADES_DATA } from './dbSeed/localidades';
import { CATEGORIA_RED } from './dbSeed/categoria';
import { TIPO_CLIENTES } from './dbSeed/tipoCliente';
import {GRUPO_DESTINO} from './dbSeed/grupoDestino';
import { ULTIMA_MILLA } from './dbSeed/ultimaMilla';
import { PROVEEDOR_SERVICIO_COMPARTIDO } from './dbSeed/servicioCompartido';


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
    await this.seedCategoriasSubcategoriasDetalles();
    await this.seedGrupoDestino();
    await this.seedUltimaMilla();
    await this.seedProveedorServicioCompartido();

    console.log('✅ Seeds completed!');
  }

  private async createUserSeed() {
    const existingUser = await this.userService.findUserByEmail('test@example.com');

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
        console.log(`   ⚠️  ${tipoCliente.valor} ya existe`);
      }
    }
  }
 

  private async seedEstadosCiudadesLocalidades() {
    console.log('🏙️  Seeding Estados, Ciudades y Localidades...');

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
        const estados = await this.miscellaneousService.findAll({ categoria: 'ESTADO' });
        const existente = estados.find((e: any) => e.valor === estadoNombre);
        if (existente) {
          estadosMap.set(estadoNombre, existente._id.toString());
        }
      }
    }

    console.log('   🏙️  Paso 2: Creando ciudades...');
    const ciudadesMap = new Map<string, string>();

    for (const [ciudadNombre, ciudadData] of Object.entries(CIUDADES_DATA)) {
      try {
        const estadoId = ciudadData.estado ? estadosMap.get(ciudadData.estado) : undefined;

        const ciudad = await this.miscellaneousService.create({
          categoria: 'CIUDAD',
          valor: ciudadNombre,
          estadoId: estadoId,
          padreId: estadoId,
          padreNombre: ciudadData.estado || undefined,
          descripcion: ciudadData.estado ? `${ciudadNombre}, ${ciudadData.estado}` : ciudadNombre,
          activo: true,
        });

        ciudadesMap.set(ciudadNombre, ciudad._id.toString());
        console.log(`      ✓ Ciudad: ${ciudadNombre} ${ciudadData.estado ? `(${ciudadData.estado})` : ''}`);
      } catch (error) {
        console.log(`      ⚠️  Ciudad ${ciudadNombre} ya existe`);
        const ciudades = await this.miscellaneousService.findAll({ categoria: 'CIUDAD' });
        const existente = ciudades.find((c: any) => c.valor === ciudadNombre);
        if (existente) {
          ciudadesMap.set(ciudadNombre, existente._id.toString());
        }
      }
    }

    console.log('   📍 Paso 3: Creando localidades...');
    let totalLocalidades = 0;

    for (const [ciudadNombre, ciudadData] of Object.entries(CIUDADES_DATA)) {
      if (ciudadData.localidades && ciudadData.localidades.length > 0) {
        const ciudadId = ciudadesMap.get(ciudadNombre);
        if (!ciudadId) {
          console.log(`      ⚠️  No se pudo crear localidades para ${ciudadNombre}: ciudad no encontrada`);
          continue;
        }

        const localidadesPromises = ciudadData.localidades.map(async (localidadNombre) => {
          try {
            await this.miscellaneousService.create({
              categoria: 'LOCALIDAD',
              valor: localidadNombre,
              ciudadId: ciudadId,
              padreId: ciudadId,
              padreNombre: ciudadNombre,
              descripcion: `${localidadNombre}, ${ciudadNombre}`,
              activo: true,
            });
            return true;
          } catch (error) {
            return false;
          }
        });

        const results = await Promise.all(localidadesPromises);
        const creadas = results.filter((r) => r).length;
        totalLocalidades += creadas;

        console.log(`      ✓ ${ciudadNombre}: ${creadas}/${ciudadData.localidades.length} localidades`);
      }
    }

    console.log(
      `   ✅ Total: ${estadosMap.size} estados, ${ciudadesMap.size} ciudades, ${totalLocalidades} localidades`,
    );
  }

  // ✅ CORREGIDO: Seed unificado con padreId y padreNombre explícitos
  private async seedCategoriasSubcategoriasDetalles() {
    console.log('🌐 Seeding Categorías, Subcategorías y Detalles...');

    // ✅ Separar el array por tipo
    const categorias = CATEGORIA_RED.filter((item) => item.categoria === 'CATEGORIA_RED');
    const subcategorias = CATEGORIA_RED.filter((item) => item.categoria === 'SUBCATEGORIA');
    const detalles = CATEGORIA_RED.filter((item) => item.categoria === 'DETALLE');

    console.log(`   📊 Total: ${categorias.length} categorías, ${subcategorias.length} subcategorías, ${detalles.length} detalles`);

    // ✅ Mapa de valor → _id para cada nivel
    const categoriasMap = new Map<string, string>();
    const subcategoriasMap = new Map<string, string>();

    // ✅ PASO 1: Crear CATEGORIA_RED
    console.log('   📍 Paso 1: Creando Categorías de Red...');
    for (const cat of categorias) {
      try {
        const nuevaCat = await this.miscellaneousService.create({
          categoria: 'CATEGORIA_RED',
          valor: cat.valor,
          descripcion: cat.descripcion || '',
          activo: true,
          tipoIncidencia: cat.tipoIncidencia || [],
        });
        categoriasMap.set(cat.valor, nuevaCat._id.toString());
        console.log(`      ✓ Categoría: ${cat.valor}`);
      } catch (error) {
        console.log(`      ⚠️  Categoría ${cat.valor} ya existe`);
        // Buscar la existente
        const todas = await this.miscellaneousService.findAll({});
        const existente = todas.find(
          (c: any) => c.categoria === 'CATEGORIA_RED' && c.valor === cat.valor,
        );
        if (existente) {
          categoriasMap.set(cat.valor, existente._id.toString());
        }
      }
    }

    console.log(`   ✅ Categorías mapeadas: ${categoriasMap.size}`);
    console.log(`   📋 Keys: ${Array.from(categoriasMap.keys()).join(', ')}`);

    // ✅ PASO 2: Crear SUBCATEGORIA con categoriaId, padreId y padreNombre
    console.log('   📍 Paso 2: Creando Subcategorías...');
    for (const subcat of subcategorias) {
      if (!subcat.categoriaId) {
        console.log(`      ⚠️  No se pudo crear subcategoría ${subcat.valor}: categoría padre no especificada`);
        continue;
      }

      const categoriaPadreId = categoriasMap.get(subcat.categoriaId);

      if (!categoriaPadreId) {
        console.log(`      ⚠️  No se pudo crear subcategoría ${subcat.valor}: categoría padre "${subcat.categoriaId}" no encontrada`);
        continue;
      }

      try {
        const nuevaSubcat = await this.miscellaneousService.create({
          categoria: 'SUBCATEGORIA',
          valor: subcat.valor,
          descripcion: subcat.descripcion || '',
          activo: true,
          categoriaId: categoriaPadreId, // ✅ Campo específico
          padreId: categoriaPadreId,      // ✅ Campo genérico
          padreNombre: subcat.categoriaId, // ✅ Nombre del padre
        });
        subcategoriasMap.set(subcat.valor, nuevaSubcat._id.toString());
        console.log(`      ✓ Subcategoría: ${subcat.valor} → ${subcat.categoriaId} (${categoriaPadreId})`);
      } catch (error) {
        console.log(`      ⚠️  Subcategoría ${subcat.valor} ya existe`);
        // Buscar la existente
        const todas = await this.miscellaneousService.findAll({});
        const existente = todas.find(
          (s: any) => s.categoria === 'SUBCATEGORIA' && s.valor === subcat.valor,
        );
        if (existente) {
          subcategoriasMap.set(subcat.valor, existente._id.toString());
        }
      }
    }

    console.log(`   ✅ Subcategorías mapeadas: ${subcategoriasMap.size}`);
    console.log(`   📋 Keys: ${Array.from(subcategoriasMap.keys()).join(', ')}`);

    // ✅ PASO 3: Crear DETALLE con subcategoriaId, padreId y padreNombre
    console.log('   📍 Paso 3: Creando Detalles...');
    let totalDetalles = 0;

    // Procesar detalles en paralelo por subcategoría padre
    const detallesPorSubcat = new Map<string, typeof detalles>();
    for (const det of detalles) {
      if (!det.categoriaId) {
        console.log(`      ⚠️  Detalle ${det.valor} omitido: subcategoría padre no especificada`);
        continue;
      }

      const lista = detallesPorSubcat.get(det.categoriaId) || [];
      lista.push(det);
      detallesPorSubcat.set(det.categoriaId, lista);
    }

    for (const [subcatNombre, detallesGrupo] of detallesPorSubcat.entries()) {
      const subcatPadreId = subcategoriasMap.get(subcatNombre);

      if (!subcatPadreId) {
        console.log(`      ⚠️  No se pudo crear detalles para "${subcatNombre}": subcategoría no encontrada`);
        continue;
      }

      const detallesPromises = detallesGrupo.map(async (det) => {
        try {
          await this.miscellaneousService.create({
            categoria: 'DETALLE',
            valor: det.valor,
            descripcion: det.descripcion || '',
            activo: true,
            subcategoriaId: subcatPadreId, // ✅ Campo específico
            padreId: subcatPadreId,         // ✅ Campo genérico
            padreNombre: subcatNombre,      // ✅ Nombre del padre
          });
          return true;
        } catch (error) {
          return false;
        }
      });

      const results = await Promise.all(detallesPromises);
      const creados = results.filter((r) => r).length;
      totalDetalles += creados;

      console.log(`      ✓ ${subcatNombre}: ${creados}/${detallesGrupo.length} detalles`);
    }

    console.log(
      `   ✅ Total: ${categoriasMap.size} categorías, ${subcategoriasMap.size} subcategorías, ${totalDetalles} detalles`,
    );
  }


     private async seedGrupoDestino() {
    console.log('🏢 Seeding grupos de destino...');
    for (const grupo of GRUPO_DESTINO) {
      try {
        await this.miscellaneousService.create({
          categoria: 'GRUPO_DESTINO',
          descripcion: grupo.descripcion,
          activo: true,
          valor: grupo.valor,
        });
        console.log(`   ✓ Grupo de destino creado: ${grupo.valor}`);
      } catch (error) {
        console.log(`   ⚠️  ${grupo.valor} ya existe`);
      }
    }
  }

     private async seedUltimaMilla() {
    console.log('🏢 Seeding últimas millas...');
    for (const ultimaMilla of ULTIMA_MILLA) {
      try {
        await this.miscellaneousService.create({
          categoria: 'ULTIMA_MILLA',
          descripcion: ultimaMilla.descripcion,
          activo: ultimaMilla.activo,
          valor: ultimaMilla.valor,
        });
        console.log(`   ✓ Última milla creada: ${ultimaMilla.valor}`);
      } catch (error) {
        console.log(`   ⚠️  ${ultimaMilla.valor} ya existe`);
      }
    }
  }

    private async seedProveedorServicioCompartido() {
    console.log('🏢 Seeding proveedores de servicios compartidos...');
    for (const proveedor of PROVEEDOR_SERVICIO_COMPARTIDO) {
      try {
        await this.miscellaneousService.create({
          categoria: 'PROVEEDOR',
          descripcion: proveedor.descripcion,
          activo: proveedor.activo,
          valor: proveedor.valor,
        });
        console.log(`   ✓ Proveedor de servicio compartido creado: ${proveedor.valor}`);
      } catch (error) {
        console.log(`   ⚠️  ${proveedor.valor} ya existe`);
      }
    }
  }
  
   
}