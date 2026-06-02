import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm'; 
import { Service } from './entities/service.entity';
import { ObjectId } from 'mongodb';

@Injectable()
export class ServiceService {

  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: MongoRepository<Service>, 
  ) {}

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
  
    const existingService = await this.serviceRepository.findOneBy({ 
     
      id_circuito: serviceData.id_circuito
    });

    if (existingService) {
      throw new ConflictException('El circuito ya está en uso');
    }

  
    const newService = this.serviceRepository.create(serviceData);
    return await this.serviceRepository.save(newService);
  }

  async searchAll(search?: string): Promise<Service[]> {
    if (!search) {
      return this.findAll();
    }


    return await this.serviceRepository.find({
      where: {
        $or: [
          { id_circuito: { $regex: search, $options: 'i' } },
          { id_netuno: { $regex: search, $options: 'i' } },
          { nombre_cliente: { $regex: search, $options: 'i' } }
        ]
      } as any,
      order: { id_circuito: 1 } 
    });
  }
}