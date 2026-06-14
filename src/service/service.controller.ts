import { Controller, Post, Get, Body, Param, Query, Put } from '@nestjs/common';
import { ServiceService } from '../service/service.service';
import { ServiceResponseDto, ServiceDto } from './dto/service.dto';
import { ObjectId } from 'mongodb';

@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
  ): Promise<ServiceResponseDto[]> {
    const services = await this.serviceService.searchAll(search);
    return services.map((s) => ({
      _id: s._id.toString(),
      tipoServicio: s.tipoServicio,
      name: s.name,
      city: s.city,
      tipoCliente: s.tipoCliente,
      ipNetuno: s.ipNetuno,
      id_netuno: s.id_netuno,
      idRBS: s.idRBS,
      serialONT: s.serialONT,
      id_circuito: s.id_circuito,
      vlan: s.vlan ?? null,
      contrato: s.contrato ?? null,
      nodoA: s.nodoA,
      nodoB: s.nodoB,
      nodoOLT: s.nodoOLT,
      diagramaRed: s.diagramaRed,
      status: s.status || 'Activo',
    }));
  }

  @Post()
  async createService(@Body() body: ServiceDto) {
    return await this.serviceService.createService(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateServiceDto: any) {
    console.log('Actualizando servicio:', id, 'con datos:', updateServiceDto);
    return await this.serviceService.updateService(id, updateServiceDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // Convertimos el string a ObjectId aquí mismo
    return await this.serviceService.findServiceById(new ObjectId(id));
  }
}
