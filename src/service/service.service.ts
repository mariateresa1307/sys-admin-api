import { ConflictException, Injectable, InternalServerErrorException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm'; 
import { Service } from './entities/service.entity';
import { ObjectId } from 'mongodb';

@Injectable()
export class ServiceService implements OnModuleInit {

  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: MongoRepository<Service>, 
  ) {}


  async onModuleInit() {
    try {
    
      await this.serviceRepository.createCollectionIndex(
        { id_netuno: 1 }, 
        { unique: true, partialFilterExpression: { id_netuno: { $exists: true, $ne: null } } }
      );
      await this.serviceRepository.createCollectionIndex(
        { id_circuito: 1 }, 
        { unique: true, partialFilterExpression: { id_circuito: { $exists: true, $ne: null } } }
      );
      await this.serviceRepository.createCollectionIndex(
        { idRBS: 1 }, 
        { unique: true, partialFilterExpression: { idRBS: { $exists: true, $ne: null } } }
      );
    } catch (error) {
      console.warn("Los índices ya existen o no pudieron crearse, continuando...");
    }
  }

  async remove(id: string): Promise<void> {
    const service = await this.findServiceById(new ObjectId(id));
    service.status = 'Inactivo';
    await this.serviceRepository.save(service);
  }

async updateService(id: string, data: any) {
  // Eliminamos _id si llega por accidente
  const { _id, ...updateData } = data;

  try {
    const result = await this.serviceRepository.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData } // $set evita intentar insertar o duplicar
    );

    if (result.matchedCount === 0) throw new NotFoundException('No encontrado');
    return { success: true };
  } catch (error) {
    // Si el error es 11000, significa que el id_circuito o id_netuno ya existe
    if (error.code === 11000) {
      throw new ConflictException('El ID ya existe en otro servicio');
    }
    throw new InternalServerErrorException('Error al actualizar base de datos');
  }
}


  async findAll(): Promise<Service[]> {
    return await this.serviceRepository.find();
  }
  
  async findServiceById(id: ObjectId): Promise<Service> {
    const service = await this.serviceRepository.findOneBy({ _id: id });
    if (!service) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }
    return service;
  }

  async createService(serviceData: Partial<Service>): Promise<Service> {
  try {
    const cleanData = { ...serviceData };
    Object.keys(cleanData).forEach(k => {
      const key = k as keyof Partial<Service>;
      if ((cleanData[key] as any) === "") {
        (cleanData as any)[key] = null;
      }
    });

    const newService = this.serviceRepository.create(cleanData);
    return await this.serviceRepository.save(newService);
  } catch (error: any) {
    if (error.code === 11000) {
      throw new ConflictException('Uno de los identificadores únicos (Circuito o ID Netuno) ya está en uso');
    }
    throw error;
  }
}

  async searchAll(search?: string): Promise<Service[]> {
    if (!search) return this.findAll();

    const results = await this.serviceRepository.find({
      where: {
        $or: [
          { id_circuito: { $regex: search, $options: 'i' } },
          { id_netuno: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ]
      } as any 
    });
    return results;
  }
}