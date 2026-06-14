import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Miscellaneous } from './entities/miscellaneous.entity';
import { CreateMiscellaneousDto } from './dto/create-miscellaneous.dto';
import { UpdateMiscellaneousDto } from './dto/update-miscellaneous.dto';
import { CategoryFilterDto } from './dto/categoryFilter.dto';

@Injectable()
export class MiscellaneousService {
  constructor(
    @InjectRepository(Miscellaneous)
    private readonly miscellaneousRepository: MongoRepository<Miscellaneous>,
  ) {}

  async create(createDto: CreateMiscellaneousDto) {
    let padreId: string | undefined;
    let padreNombre: string | undefined;

    // Validar duplicados
    const exists = await this.miscellaneousRepository.findOne({
      where: {
        categoria: createDto.categoria,
        valor: createDto.valor.toUpperCase(),
      },
    });

    if (exists) {
      throw new BadRequestException(
        `El valor '${createDto.valor}' ya existe en la categoría '${createDto.categoria}'`,
      );
    }

    // ✅ MAPEO DE RELACIONES JERÁRQUICAS
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

      // Categorías raíz no tienen padre
      case 'CATEGORIA_RED':
      case 'ESTADO':
      case 'CAUSA_RAIZ':
      case 'TIPO_CLIENTE':
      case 'GRUPO_DESTINO':
      case 'PLATAFORMA':
      case 'SERVICIO':
      case 'ULTIMA_MILLA':
      case 'POR_DEFINIR':
        padreId = undefined;
        break;

      default:
        throw new BadRequestException(`Categoría '${createDto.categoria}' no válida`);
    }

    // Validar que el padre exista si se proporcionó padreId
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

    const newItem = this.miscellaneousRepository.create({
      ...createDto,
      padreId: padre?._id,
      valor: createDto.valor.toUpperCase(),
    });

    return await this.miscellaneousRepository.save(newItem);
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

  async update(id: string, updateDto: UpdateMiscellaneousDto) {
    const item = await this.findOne(id);

    if (updateDto.valor && updateDto.valor.toUpperCase() !== item.valor) {
      const exists = await this.miscellaneousRepository.findOne({
        where: {
          categoria: updateDto.categoria || item.categoria,
          valor: updateDto.valor.toUpperCase(),
        },
      });
      if (exists) {
        throw new BadRequestException(
          `El valor '${updateDto.valor}' ya existe en esta categoría`,
        );
      }
    }

    const updatedData = {
      ...updateDto,
      valor: updateDto.valor ? updateDto.valor.toUpperCase() : item.valor,
    };

    await this.miscellaneousRepository.update(id, updatedData);
    return this.findOne(id);
  }

  async remove(id: string) {
    const item = await this.findOne(id);

    // Eliminar hijos si es CIUDAD
    if (item.categoria === 'CIUDAD') {
      await this.miscellaneousRepository.delete({
        categoria: 'LOCALIDAD',
        padreId: new ObjectId(id),
      });
    }

    // Eliminar hijos si es SUBCATEGORIA
    if (item.categoria === 'SUBCATEGORIA') {
      await this.miscellaneousRepository.delete({
        categoria: 'DETALLE',
        padreId: new ObjectId(id),
      });
    }

    // Eliminar hijos si es CAUSA_RAIZ
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