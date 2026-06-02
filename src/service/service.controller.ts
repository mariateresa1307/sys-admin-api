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
    tipoServicio: s.tipoServicio || 'N/A',
    name: s.name || 'N/A',
    city: s.city || 'N/A',
    tipo_cliente: s.tipo_cliente || 'N/A',
    idNetuno: s.id_netuno || 'N/A',
    serialONT: s.serial_ont || 'N/A',
    id_Circuito: s.id_circuito || 'N/A',
    vlan: s.vlan,
    contrato: s.contrato,
    nodeA: s.nodoA,
    nodeB: s.nodoB,
    oltnode: s.nodoOLT,
    diagramaRed: s.diagramaRed,
    status: s.status || 'Activo',
  }));
}

@Post()
async createService(@Body() dto: ServiceResponseDto) {
  // Traducimos del DTO a la Entidad
  const entityData = {
    tipoServicio: dto.tipoServicio,
    name: dto.name, 
    city: dto.city,
    tipo_cliente: dto.tipo_cliente,
    id_netuno: dto.idNetuno,
    serial_ont: dto.serialONT,
    id_circuito: dto.id_Circuito, 
    vlan: Number(dto.vlan),
    contrato: dto.contrato,
    nodoA: dto.nodeA,
    nodoB: dto.nodeB,
    nodoOLT: dto.oltnode,
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