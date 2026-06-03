import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ServiceService } from '../service/service.service';
import { ServiceResponseDto } from './dto/service-response.dto'; 
import { ObjectId } from 'mongodb';

@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}


@Get()
async findAll(@Query('search') search?: string): Promise<ServiceResponseDto[]> {
  const services = await this.serviceService.searchAll(search);
  
  return services.map(s => ({
    _id: s._id?.toString(),
    tipoServicio: s.tipoServicio ,
    name: s.name ,
    city: s.city,
    tipo_cliente: s.tipo_cliente,
    id_netuno: s.id_netuno ,
    serialONT: s.serialONT ,
    id_circuito: s.id_circuito ,
    vlan: s.vlan,
    contrato: s.contrato,
    nodoA: s.nodoA,
    nodoB: s.nodoB,
    nodoOLT: s.nodoOLT,
    diagramaRed: s.diagramaRed,
    status: s.status || 'Activo',
  }));
}

@Post()
async createService(@Body() dto: ServiceResponseDto) {

  const entityData = {
    tipoServicio: dto.tipoServicio,
    name: dto.name, 
    city: dto.city,
    tipo_cliente: dto.tipo_cliente,

    id_netuno: dto.id_netuno,
    id_circuito: dto.id_circuito, 

    nodoA: dto.nodoA,
    nodoB: dto.nodoB,
    nodoOLT: dto.nodoOLT,

    serialONT: dto.serialONT,
    vlan: (dto.vlan !== undefined && dto.vlan !== null ) ? Number(dto.vlan) : null,
    contrato: (dto.contrato !== undefined && dto.contrato !== null ) ? Number(dto.contrato) : null,
    diagramaRed: dto.diagramaRed,
    status: dto.status,
  };
  
  return await this.serviceService.createService(entityData);
}
  
  @Get(':id')
  async findOne(@Param('id') id: string) {
    // Convertimos el string a ObjectId aquí mismo
    return await this.serviceService.findServiceById(new ObjectId(id));
  }
  
}