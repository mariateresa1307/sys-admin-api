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

  // ✅ MÉTODO ACTUALIZADO: Agregamos 'req?: any' como parámetro opcional
  async updateService(id: string, data: any, req?: any) {
    const { _id, ...updateData } = data;

    try {
      // ✅ PASO 1: Capturar el estado actual ANTES de actualizar
      const currentService = await this.serviceRepository.findOne({ _id: new ObjectId(id) } as any);
         
      
      console.log(' [ServiceService] Servicio actual encontrado:', currentService?._id);
    console.log('🔍 [ServiceService] ¿Existe req?', !!req);

      if (currentService && req) {
        // Eliminamos el _id interno para que el log de auditoría sea limpio y no redundante
        const { _id: _, ...safeOldData } = currentService as any;
        (req as any).oldValue = safeOldData;

        console.log('✅ [ServiceService] oldValue asignado al request:', Object.keys(safeOldData));
      console.log('✅ [ServiceService] req.oldValue:', (req as any).oldValue ? 'EXISTS' : 'NULL')
      }else {
      console.warn('⚠️ [ServiceService] No se pudo asignar oldValue');
      console.warn('  - currentService:', !!currentService);
      console.warn('  - req:', !!req);
    }


      // ✅ PASO 2: Realizar la actualización
      const result = await this.serviceRepository.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData },
      );

      if (result.matchedCount === 0) {
        throw new NotFoundException('Servicio no encontrado');
      }
      
      console.log('✅ [ServiceService] Servicio actualizado correctamente');
    return { success: true };
     
      
    } catch (error: any) {
       console.error('❌ [ServiceService] Error en updateService:', error);
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

  async removeService(id: string): Promise<void> {
    const service = await this.findServiceById(new ObjectId(id));
    service.status = 'Inactivo';
    await this.serviceRepository.save(service);
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