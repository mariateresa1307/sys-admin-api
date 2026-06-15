import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Service } from './entities/service.entity';
import { ObjectId } from 'mongodb';
import { ServiceDto } from './dto/service.dto';

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
        {
          unique: true,
          partialFilterExpression: { id_netuno: { $exists: true, $ne: null } },
        },
      );
      await this.serviceRepository.createCollectionIndex(
        { id_circuito: 1 },
        {
          unique: true,
          partialFilterExpression: {
            id_circuito: { $exists: true, $ne: null },
          },
        },
      );
      await this.serviceRepository.createCollectionIndex(
        { idRBS: 1 },
        {
          unique: true,
          partialFilterExpression: { idRBS: { $exists: true, $ne: null } },
        },
      );
    } catch (error) {
      console.warn(
        'Los índices ya existen o no pudieron crearse, continuando...',
      );
    }
  }

  async remove(id: string): Promise<void> {
    const service = await this.findServiceById(new ObjectId(id));
    service.status = 'Inactivo';
    await this.serviceRepository.save(service);
  }

  async updateService(id: string, data: any) {
    const { _id, ...updateData } = data;

    try {
      const result = await this.serviceRepository.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData },
      );

      if (result.matchedCount === 0)
        throw new NotFoundException('No encontrado');
      return { success: true };
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('El ID ya existe en otro servicio');
      }
      throw new InternalServerErrorException(
        'Error al actualizar base de datos',
      );
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

  async createService(serviceData: Partial<ServiceDto>): Promise<Service> {
    try {
      const newService = this.serviceRepository.create(serviceData);
      return await this.serviceRepository.save(newService);
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException(
          'Uno de los identificadores únicos (Circuito o ID Netuno) ya está en uso',
        );
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
          { name: { $regex: search, $options: 'i' } },
        ],
      } as any,
    });
    return results;
  }

  // ✅ NUEVO MÉTODO: Actualizar servicios que no tienen proveedor
  async updateMissingProveedor(): Promise<{
    message: string;
    updated: number;
    skipped: number;
    total: number;
  }> {
    console.log('🔧 [ServiceService] Iniciando actualización de proveedores faltantes...');
    
    const services = await this.serviceRepository.find();
    console.log(`🔧 [ServiceService] Total de servicios encontrados: ${services.length}`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const service of services) {
      if (!service.proveedorDelServicioCompartido) {
        await this.serviceRepository.updateOne(
          { _id: service._id },
          { $set: { proveedorDelServicioCompartido: 'TELEFONICA' } },
        );
        updated++;
        console.log(`   ✓ Actualizado: ${service.name || service._id}`);
      } else {
        skipped++;
      }
    }

    console.log(`✅ [ServiceService] Proceso completado:`);
    console.log(`   - Actualizados: ${updated}`);
    console.log(`   - Omitidos (ya tenían proveedor): ${skipped}`);

    return { 
      message: `${updated} servicios actualizados con proveedor por defecto`,
      updated,
      skipped,
      total: services.length
    };
  }
}