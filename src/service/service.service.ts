import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
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


    private async validateUniqueFields(
    serviceId: string | undefined,
    tipoServicio?: string,
    data?: any,
  ) {
    if (!tipoServicio) {
      return;
    }

    const conditions: any[] = [];

    if (tipoServicio === 'RBS') {
      if (data.id_circuito) conditions.push({ id_circuito: data.id_circuito });
      if (data.idRBS) conditions.push({ idRBS: data.idRBS });
      if (data.serialONT) conditions.push({ serialONT: data.serialONT });
    } else if (tipoServicio === 'METROLAN') {
      if (data.id_circuito) conditions.push({ id_circuito: data.id_circuito });
      if (data.contrato) conditions.push({ contrato: Number(data.contrato) });
      if (data.serialONT) conditions.push({ serialONT: data.serialONT });
    } else if (tipoServicio === 'DOG') {
      if (data.id_circuito) conditions.push({ id_circuito: data.id_circuito });
      if (data.id_netuno) conditions.push({ id_netuno: data.id_netuno });
      if (data.contrato) conditions.push({ contrato: Number(data.contrato) });
      if (data.serialONT) conditions.push({ serialONT: data.serialONT });
    } else if (tipoServicio === 'REDES COMPARTIDAS') {
      if (data.ipNetuno) conditions.push({ ipNetuno: data.ipNetuno });
      if (data.contrato) conditions.push({ contrato: Number(data.contrato) });
    }

    if (conditions.length > 0) {
      // Buscar cualquiera de las condiciones sin excluir por _id aún
      const existing = await this.serviceRepository.findOne({ 
        where: { $or: conditions } as any 
      });
      
      // Si existe, verificar que NO sea el mismo registro que se está editando
      if (existing && serviceId && String(existing._id) === String(serviceId)) {
        // Es el mismo registro, no es duplicado → permitir actualización
        return;
      }

      if (existing) {
        const conflicts: string[] = [];
        if (data.id_circuito && existing.id_circuito === data.id_circuito) conflicts.push('ID Circuito');
        if (data.idRBS && existing.idRBS === data.idRBS) conflicts.push('ID RBS');
        if (data.id_netuno && existing.id_netuno === data.id_netuno) conflicts.push('ID Netuno');
        if (data.contrato && String(existing.contrato) === String(data.contrato)) conflicts.push('Contrato');
        if (data.serialONT && existing.serialONT === data.serialONT) conflicts.push('Serial ONT');
        if (data.ipNetuno && existing.ipNetuno === data.ipNetuno) conflicts.push('IP Netuno');

        const camposTexto = conflicts.length > 1 
          ? `los campos ${conflicts.join(' y ')}` 
          : `el campo ${conflicts[0]}`;
          
        throw new BadRequestException(`${camposTexto} ya existe, debes validar la información.`);
      }
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
    nodos?: string,
  ) {
    const take = limit > 0 ? limit : 10;
    const skip = page > 1 ? (page - 1) * take : 0;
    const where: any = {};

      if (nodos?.trim()) {
      const searchRegex = { $regex: nodos.trim(), $options: 'i' };
      where.$or = [
        { nodoA: searchRegex },
        { nodoB: searchRegex },
        { nodoOLT: searchRegex }
      ];
    } else if (search?.trim()) {
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

  async remove(id: string, req?: any): Promise<void> {
    const service = await this.findServiceById(new ObjectId(id));

    if (req) {
      const { _id: _, ...safeOldData } = service as any;
      (req as any).oldValue = safeOldData;
    }

    service.status = 'Inactivo';
    await this.serviceRepository.save(service);
  }

  async updateService(id: string, data: any, req?: any): Promise<any> {
    try {
      console.log(`🔄 [updateService] Actualizando servicio ID: ${id}`);
      console.log(`📦 [updateService] Datos recibidos:`, data);

      const currentService = await this.serviceRepository.findOne({ 
        _id: new ObjectId(id) 
      } as any);

      if (!currentService) {
        throw new NotFoundException('Servicio no encontrado');
      }

      console.log(`✅ [updateService] Servicio encontrado:`, currentService._id);

      const tipoServicioParaValidar = data.tipoServicio || currentService.tipoServicio;
      console.log(` [updateService] Tipo de servicio para validar: ${tipoServicioParaValidar}`);

      await this.validateUniqueFields(id, tipoServicioParaValidar, data);

      // Lógica de auditoría existente
      if (req) {
        const { _id: _, ...safeOldData } = currentService as any;
        (req as any).oldValue = safeOldData;
      }

      const result = await this.serviceRepository.updateOne(
        { _id: new ObjectId(id) },
        { $set: data },
      );

      if (result.matchedCount === 0) {
        throw new NotFoundException('Servicio no encontrado');
      }
      
      if (req) {
        const updatedService = await this.serviceRepository.findOne({ 
          _id: new ObjectId(id) 
        } as any);
        if (updatedService) {
          const { _id: _, ...safeNewData } = updatedService as any;
          (req as any).newValue = safeNewData;
        }
      }

      console.log(`✅ [updateService] Servicio actualizado exitosamente`);
      return { success: true, message: 'Servicio actualizado correctamente' };
    } catch (error: any) {
      // Permitir que el BadRequestException pase intacto
      if (error instanceof BadRequestException) {
        console.log(`⚠️ [updateService] Validación de duplicados falló:`, error.message);
        throw error;
      }
      
      if (error.code === 11000) {
        throw new ConflictException('Uno de los identificadores únicos ya está en uso.');
      }
      
      console.error(`❌ [updateService] Error:`, error);
      throw error;
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
    await this.validateUniqueFields(undefined, serviceData.tipoServicio, serviceData);

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

  async removeService(id: string, req?: any): Promise<void> {
    const service = await this.findServiceById(new ObjectId(id));

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