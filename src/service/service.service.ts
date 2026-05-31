import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm'; // <--- IMPORTANTE: Cambiado a MongoRepository
import { Service } from './entities/service.entity';
import { ObjectId } from 'mongodb';

@Injectable()
export class ServiceService {

  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: MongoRepository<Service>, // <--- Cambiado aquí
  ) {}

  async findServiceById(id: ObjectId): Promise<Service> {
   
    const service = await this.serviceRepository.findOneBy({ _id: id });
    if (!service) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }
    return service;
  }

  async createService(serviceData: Partial<Service>): Promise<Service> {
    const existingService = await this.serviceRepository.findOneBy({ 
      id_circuito: serviceData.id_circuito 
    });

    if (existingService) {
      throw new ConflictException('El circuito ya está en uso');
    }

    return await this.serviceRepository.save(serviceData);
  }

  async searchAll(search?: string): Promise<Service[]> {
    if (!search) {
      return await this.serviceRepository.find();
    }

   
    return await this.serviceRepository.find({
      where: {
        id_circuito: { $regex: search, $options: 'i' } 
      } as any,
      order: { id_circuito: 1 } 
    });
  }
}