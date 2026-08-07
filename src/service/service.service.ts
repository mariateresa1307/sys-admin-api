import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, DeepPartial } from 'typeorm';
import { Service } from './entities/service.entity';
import { ObjectId } from 'mongodb';
import { ServiceDto } from './dto/service.dto';

@Injectable()
export class ServiceService implements OnModuleInit {
  private readonly logger = new Logger(ServiceService.name);

  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: MongoRepository<Service>,
  ) {}

  async onModuleInit() {
    try {
      await this.serviceRepository.createCollectionIndex(
        { id_netuno: 1 },
        { unique: true, partialFilterExpression: { id_netuno: { $exists: true, $ne: null } } },
      );
      await this.serviceRepository.createCollectionIndex(
        { id_circuito: 1 },
        { unique: true, partialFilterExpression: { id_circuito: { $exists: true, $ne: null } } },
      );
      await this.serviceRepository.createCollectionIndex(
        { idRBS: 1 },
        { unique: true, partialFilterExpression: { idRBS: { $exists: true, $ne: null } } },
      );
    } catch (error) {
      this.logger.warn('Los índices ya existen o no pudieron crearse, continuando...');
    }
  }

  async findAllPaginated(
    page = 1,
    limit = 10,
    search?: string,
    tipoServicio?: string,
    excludeTipo?: string,
    status?: string,
    tipoCliente?: string,
    vlan?: number | null,
  ) {
    const take = limit > 0 ? limit : 10;
    const skip = page > 1 ? (page - 1) * take : 0;
    const where: any = {};

    if (search?.trim()) {
      where.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { id_circuito: { $regex: search.trim(), $options: 'i' } },
        { id_netuno: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (tipoServicio && tipoServicio !== 'Todos') {
      where.tipoServicio = tipoServicio;
    }

    if (excludeTipo) {
      where.tipoServicio = { $ne: excludeTipo };
    }

    if (status && status.trim() !== '') {
      where.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }

    if (tipoCliente && tipoCliente.trim() !== '') {
      where.tipoCliente = tipoCliente;
    }

    const [data, total] = await Promise.all([
      this.serviceRepository.find({
        where,
        skip,
        take,
        order: { status: 'ASC', createdAt: 'DESC' },
      } as any),
      this.serviceRepository.count(where as any),
    ]);

    return {
      data,
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  // ✅ FIX: Acepta req para capturar oldValue antes del soft-delete
  async remove(id: string, req?: any): Promise<void> {
    const service = await this.findServiceById(new ObjectId(id));

    // ✅ Capturar estado anterior para auditoría (el interceptor lee req.oldValue en DELETE)
    if (req) {
      const { _id: _, ...safeOldData } = service as any;
      (req as any).oldValue = safeOldData;
    }

    service.status = 'Inactivo';
    await this.serviceRepository.save(service);
  }

  async updateService(id: string, data: any, req?: any) {
    const { _id, ...updateData } = data;

    try {
      // ✅ PASO 1: Capturar el estado actual ANTES de actualizar
      const currentService = await this.serviceRepository.findOne({ _id: new ObjectId(id) } as any);

      if (currentService && req) {
        const { _id: _, ...safeOldData } = currentService as any;
        (req as any).oldValue = safeOldData;
      }

      // ✅ PASO 2: Realizar la actualización
      const result = await this.serviceRepository.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData },
      );

      if (result.matchedCount === 0) {
        throw new NotFoundException('Servicio no encontrado');
      }

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error en updateService: ${error.message}`, error.stack);
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
      const newService = this.serviceRepository.create(serviceData as DeepPartial<Service>);
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

  // ✅ FIX: Acepta req para capturar oldValue antes del toggle de status
  async removeService(id: string, req?: any): Promise<void> {
    const service = await this.findServiceById(new ObjectId(id));

    // ✅ Capturar estado anterior para auditoría
    if (req) {
      const { _id: _, ...safeOldData } = service as any;
      (req as any).oldValue = safeOldData;
    }

    service.status = service.status === 'Activo' ? 'Inactivo' : 'Activo';
    await this.serviceRepository.save(service);
  }

  async searchAll(search?: string): Promise<Service[]> {
    if (!search) return this.findAll();

    return await this.serviceRepository.find({
      where: {
        $or: [
          { id_circuito: { $regex: search, $options: 'i' } },
          { id_netuno: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
        ],
      } as any,
    });
  }

  async updateMissingProveedor(): Promise<{
    message: string;
    updated: number;
    skipped: number;
    total: number;
  }> {
    this.logger.log('Iniciando actualización de proveedores faltantes...');

    const services = await this.serviceRepository.find();
    let updated = 0;
    let skipped = 0;

    for (const service of services) {
      if (!service.proveedorDelServicioCompartido) {
        await this.serviceRepository.updateOne(
          { _id: service._id },
          { $set: { proveedorDelServicioCompartido: 'TELEFONICA' } },
        );
        updated++;
      } else {
        skipped++;
      }
    }

    this.logger.log(`Proceso completado: ${updated} actualizados, ${skipped} omitidos`);

    return {
      message: `${updated} servicios actualizados con proveedor por defecto`,
      updated,
      skipped,
      total: services.length,
    };
  }
}