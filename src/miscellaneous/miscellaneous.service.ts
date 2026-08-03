import { Injectable, NotFoundException, BadRequestException , UseGuards, Req} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Miscellaneous } from './entities/miscellaneous.entity';
import { CreateMiscellaneousDto } from './dto/create-miscellaneous.dto';
import { UpdateMiscellaneousDto } from './dto/update-miscellaneous.dto';
import { CategoryFilterDto } from './dto/categoryFilter.dto';
import { AuditService } from '../audit/audit.service'; 

@Injectable()
export class MiscellaneousService {
  constructor(
    @InjectRepository(Miscellaneous)
    private readonly miscellaneousRepository: MongoRepository<Miscellaneous>,
      private readonly auditService: AuditService, 
  ) {}

  async create(createDto: CreateMiscellaneousDto) {
    let padreId: string | undefined;
    let padreNombre: string | undefined;

    switch (createDto.categoria) {
      case 'SUBCATEGORIA':
        padreId = createDto.categoriaId;
        break;

      case 'DETALLE':
        padreId = createDto.subcategoriaId;
        break;

      case 'CIUDAD':
        padreId = createDto.estadoId;
        break;

      case 'LOCALIDAD':
        padreId = createDto.ciudadId;
        break;

      case 'SOLUCION_CASO':
        padreId = createDto.causaId;
        break;

      
      case 'TIPO_CLIENTE':
        
        if (!createDto.nivelSeveridad) {
          throw new BadRequestException('Debe proporcionar nivelSeveridad para TIPO_CLIENTE');
        }
        padreId = undefined; 
        break;

      case 'CATEGORIA_RED':
      case 'ESTADO':
      case 'CAUSA_RAIZ':
      case 'GRUPO_DESTINO':
      case 'PLATAFORMA':
      case 'SERVICIO':
      case 'ULTIMA_MILLA':
      case 'PROVEEDOR':

        padreId = undefined;
        break;

      default:
        throw new BadRequestException(`Categoría '${createDto.categoria}' no válida`);
    }


    const whereQuery: any = {
      categoria: createDto.categoria,
      valor: createDto.valor.toUpperCase(),
    };

    if (createDto.categoria === 'TIPO_CLIENTE' && createDto.nivelSeveridad) {
      whereQuery.nivelSeveridad = createDto.nivelSeveridad;
    }

    if (padreId) {
      whereQuery.padreId = new ObjectId(padreId);
    }

    const exists = await this.miscellaneousRepository.findOne({ where: whereQuery });

    if (exists) {
      if (createDto.categoria === 'SOLUCION_CASO') {
        throw new BadRequestException(
          `La solución '${createDto.valor}' ya está asociada a esta causa raíz`,
        );
      } else if (createDto.categoria === 'LOCALIDAD') {
        throw new BadRequestException(
          `La localidad '${createDto.valor}' ya está asociada a esta ciudad`,
        );
      } else if (createDto.categoria === 'CIUDAD') {
        throw new BadRequestException(
          `La ciudad '${createDto.valor}' ya está asociada a este estado`,
        );
      } else if (createDto.categoria === 'SUBCATEGORIA') {
        throw new BadRequestException(
          `La subcategoría '${createDto.valor}' ya está asociada a esta categoría`,
        );
      } else if (createDto.categoria === 'DETALLE') {
        throw new BadRequestException(
          `El detalle '${createDto.valor}' ya está asociado a esta subcategoría`,
        );
      } else if (createDto.categoria === 'TIPO_CLIENTE') {
        throw new BadRequestException(
          `El tipo de cliente '${createDto.valor}' con nivel de severidad '${createDto.nivelSeveridad}' ya existe`,
        );
      } else {
        throw new BadRequestException(
          `El valor '${createDto.valor}' ya existe en la categoría '${createDto.categoria}'`,
        );
      }
    }

    let padre;

    if (padreId) {
      padre = await this.miscellaneousRepository.findOne({
        where: { _id: new ObjectId(padreId) },
      });

      if (!padre) {
        throw new BadRequestException('El elemento padre no existe');
      }

      if (!padre.activo) {
        throw new BadRequestException('No se puede asociar a un elemento padre inactivo');
      }
    }

    const tipoIncidenciaArray = createDto.tipoIncidencia 
      ? (Array.isArray(createDto.tipoIncidencia) ? createDto.tipoIncidencia : [createDto.tipoIncidencia])
      : [];

    const newItem = this.miscellaneousRepository.create({
      ...createDto,
      padreId: padre?._id,
      valor: createDto.valor.toUpperCase(),
      tipoIncidencia: tipoIncidenciaArray,
    });

    return await this.miscellaneousRepository.save(newItem);
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    filter: { valor?: string; categoria?: string; padreId?: string; activo?: string }
  ) {
    const take = limit > 0 ? limit : 10;
    const skip = page > 1 ? (page - 1) * take : 0;
    const where: any = {};

    if (filter.categoria) {
      where.categoria = filter.categoria;
    }
    if (filter.padreId) {
      where.padreId = new ObjectId(filter.padreId);
    }
    if (filter.valor?.trim()) {
      where.valor = { $regex: filter.valor.trim(), $options: 'i' };
    }
    if (filter.activo !== undefined) {
      where.activo = filter.activo === 'true';
    }

    console.log('🔍 [SERVICE] Filtro MongoDB:', JSON.stringify(where));

    const [data, total] = await Promise.all([
      this.miscellaneousRepository.find({ 
        where, 
        skip, 
        take, 
        order: { valor: 'ASC' } 
      } as any),
      this.miscellaneousRepository.count(where as any),
    ]);

    console.log(`📊 [SERVICE] Resultados: ${data.length} de ${total} total`);

    return {
      data,
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findAll(filter: CategoryFilterDto) {
    const whereQuery = Object.entries(filter).reduce(
      (acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, any>,
    );

    if (filter.padreId) {
      whereQuery.padreId = new ObjectId(whereQuery.padreId);
    }

    return await this.miscellaneousRepository.find({
      where: whereQuery,
      order: {
        valor: 'ASC',
      },
    });
  }

  async findOne(id: string) {
    const item = await this.miscellaneousRepository.findOne({
      where: { _id: new ObjectId(id) },
    });

    if (!item) {
      throw new NotFoundException(`Elemento con ID ${id} no encontrado`);
    }

    return item;
  }

  async update(id: string, updateDto: UpdateMiscellaneousDto,  req?: any) {
    const item = await this.findOne(id);

       const oldValue = item ? {
      categoria: item.categoria,
      valor: item.valor,
      padreId: item.padreId,
      padreNombre: item.padreNombre,
      activo: item.activo,
      tipoIncidencia: item.tipoIncidencia,
      descripcion: item.descripcion,
    } : null;
  
     if (item && req) {
      const { _id, __v, createdAt, updatedAt, ...safeOldData } = item as any;
      (req as any).oldValue = safeOldData;
       console.log('🟡 [SERVICE] oldValue asignado al req. Campos:', Object.keys(safeOldData));
    }else {
      console.log('🔴 [SERVICE] FALLO: No se asignó oldValue. item existe:', !!item, 'req existe:', !!req);
    }

    const nuevoValor = updateDto.valor ? updateDto.valor.trim().toUpperCase() : item.valor;
    const valorCambio = nuevoValor !== item.valor;

    const categoriaActual = updateDto.categoria || item.categoria;
    
    let nuevoPadreId: string | undefined;
    let padreCambio = false;

    let nivelSeveridadCambio = false;
    if (categoriaActual === 'TIPO_CLIENTE') {
      const nuevoNivel = updateDto.nivelSeveridad || item.nivelSeveridad;
      if (updateDto.nivelSeveridad && updateDto.nivelSeveridad !== item.nivelSeveridad) {
        nivelSeveridadCambio = true;
      }
    }

    if (categoriaActual === 'SOLUCION_CASO') {
      nuevoPadreId = updateDto.causaId || item.padreId?.toString();
      if (updateDto.causaId && updateDto.causaId !== item.padreId?.toString()) {
        padreCambio = true;
      }
    } else if (categoriaActual === 'LOCALIDAD') {
      nuevoPadreId = updateDto.ciudadId || item.padreId?.toString();
      if (updateDto.ciudadId && updateDto.ciudadId !== item.padreId?.toString()) {
        padreCambio = true;
      }
    } else if (categoriaActual === 'CIUDAD') {
      nuevoPadreId = updateDto.estadoId || item.padreId?.toString();
      if (updateDto.estadoId && updateDto.estadoId !== item.padreId?.toString()) {
        padreCambio = true;
      }
    } else if (categoriaActual === 'SUBCATEGORIA') {
      nuevoPadreId = updateDto.categoriaId || item.padreId?.toString();
      if (updateDto.categoriaId && updateDto.categoriaId !== item.padreId?.toString()) {
        padreCambio = true;
      }
    } else if (categoriaActual === 'DETALLE') {
      nuevoPadreId = updateDto.subcategoriaId || item.padreId?.toString();
      if (updateDto.subcategoriaId && updateDto.subcategoriaId !== item.padreId?.toString()) {
        padreCambio = true;
      }
    } else {
      nuevoPadreId = undefined;
    }

    if (valorCambio || padreCambio || nivelSeveridadCambio) {
      const whereQuery: any = {
        categoria: categoriaActual,
        valor: nuevoValor,
        _id: { $ne: new ObjectId(id) },
      };

      if (categoriaActual === 'TIPO_CLIENTE') {
        whereQuery.nivelSeveridad = updateDto.nivelSeveridad || item.nivelSeveridad;
      }

      if (nuevoPadreId) {
        whereQuery.padreId = new ObjectId(nuevoPadreId);
      }

      const exists = await this.miscellaneousRepository.findOne({ where: whereQuery });
      
      if (exists) {
        if (categoriaActual === 'SOLUCION_CASO') {
          throw new BadRequestException(
            `La solución '${nuevoValor}' ya está asociada a esta causa raíz`,
          );
        } else if (categoriaActual === 'LOCALIDAD') {
          throw new BadRequestException(
            `La localidad '${nuevoValor}' ya está asociada a esta ciudad`,
          );
        } else if (categoriaActual === 'CIUDAD') {
          throw new BadRequestException(
            `La ciudad '${nuevoValor}' ya está asociada a este estado`,
          );
        } else if (categoriaActual === 'SUBCATEGORIA') {
          throw new BadRequestException(
            `La subcategoría '${nuevoValor}' ya está asociada a esta categoría`,
          );
        } else if (categoriaActual === 'DETALLE') {
          throw new BadRequestException(
            `El detalle '${nuevoValor}' ya está asociado a esta subcategoría`,
          );
        } else if (categoriaActual === 'TIPO_CLIENTE') {
          throw new BadRequestException(
            `El tipo de cliente '${nuevoValor}' con nivel de severidad '${updateDto.nivelSeveridad || item.nivelSeveridad}' ya existe`,
          );
        } else {
          throw new BadRequestException(
            `El valor '${nuevoValor}' ya existe en esta categoría`,
          );
        }
      }
    }

    let tipoIncidenciaArray = item.tipoIncidencia || [];
    if (updateDto.tipoIncidencia !== undefined) {
      tipoIncidenciaArray = Array.isArray(updateDto.tipoIncidencia) 
        ? updateDto.tipoIncidencia 
        : [updateDto.tipoIncidencia].filter(Boolean);
    }

    const updatedData: any = {
      ...updateDto,
      valor: nuevoValor,
      tipoIncidencia: tipoIncidenciaArray,
    };

    if (nuevoPadreId && nuevoPadreId !== item.padreId?.toString()) {
      const padre = await this.miscellaneousRepository.findOne({
        where: { _id: new ObjectId(nuevoPadreId) },
      });
      
      if (padre) {
        updatedData.padreId = new ObjectId(nuevoPadreId);
        updatedData.padreNombre = padre.valor;
      }
    }

    await this.miscellaneousRepository.update(id, updatedData);

   

    return this.findOne(id);
  }

  async remove(id: string) {
    const item = await this.findOne(id);

    if (item.categoria === 'CIUDAD') {
      await this.miscellaneousRepository.delete({
        categoria: 'LOCALIDAD',
        padreId: new ObjectId(id),
      });
    }

    if (item.categoria === 'SUBCATEGORIA') {
      await this.miscellaneousRepository.delete({
        categoria: 'DETALLE',
        padreId: new ObjectId(id),
      });
    }

    if (item.categoria === 'CAUSA_RAIZ') {
      await this.miscellaneousRepository.delete({
        categoria: 'SOLUCION_CASO',
        padreId: new ObjectId(id),
      });
    }

    await this.miscellaneousRepository.delete(id);

    return { message: 'Elemento eliminado correctamente' };
  }
}