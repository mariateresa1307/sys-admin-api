import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
  ) { }

  async create(createDto: CreateMiscellaneousDto) {
    let padre;
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

    // Si tiene padre, validar que exista
    if (createDto.padreId) {
      padre = await this.miscellaneousRepository.findOne({
        where: { _id: new ObjectId(createDto.padreId) },
      });
      if (!padre) {
        throw new BadRequestException('El elemento padre no existe');
      }
    }

    const newItem = this.miscellaneousRepository.create({
      ...createDto,
      ...(padre && { padreId: padre._id }),
      valor: createDto.valor.toUpperCase(),
    });

    return await this.miscellaneousRepository.save(newItem);
  }

  async findAll(filter: CategoryFilterDto) {
    const whereQuery = Object.entries(filter).reduce((acc, [key, value]) => {
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
    //await this.miscellaneousRepository.update(id, { activo: false });
    if (item.categoria === 'CIUDAD') {
      await this.miscellaneousRepository.delete({
        categoria: 'LOCALIDAD',
        padreId: new ObjectId(id),
      });
    }
    await this.miscellaneousRepository.delete(id);

    return { message: 'Elemento eliminado correctamente' };
  }
}
