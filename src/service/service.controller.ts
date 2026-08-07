import { Controller, Post, Get, Body, Param, Query, Put, UseGuards, Delete, Req } from '@nestjs/common';
import { ServiceService } from './service.service';
import { ServiceResponseDto, ServiceDto } from './dto/service.dto';
import { ObjectId } from 'mongodb';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('tipoServicio') tipoServicio?: string,
    @Query('excludeTipo') excludeTipo?: string,
    @Query('status') status?: string,
    @Query('tipoCliente') tipoCliente?: string, 
  ) {

     console.log(' [ServiceController] Parámetros recibidos:', { 
    page, limit, search, tipoServicio, excludeTipo 
  });
    const result = await this.serviceService.findAllPaginated(
      Number(page),
      Number(limit),
      search,
      tipoServicio,
      excludeTipo,
      status,
      tipoCliente,
      
    );




      console.log('📤 [ServiceController] Resultado:', {
    total: result.total,
    dataLength: result.data.length,
    page: result.page,
    totalPages: result.totalPages
  });
  
    return {
      ...result,
      data: result.data.map((s: any) => ({
        _id: s._id.toString(),
        tipoServicio: s.tipoServicio,
        name: s.name,
        city: s.city,
        tipoCliente: s.tipoCliente,
        ipNetuno: s.ipNetuno,
        producto: s.producto,
        id_netuno: s.id_netuno,
        idRBS: s.idRBS,
        serialONT: s.serialONT,
        id_circuito: s.id_circuito,
        vlan: s.vlan ?? null,
        contrato: s.contrato ?? null,
        proveedorDelServicioCompartido: s.proveedorDelServicioCompartido,
         proveedorUM: s.proveedorUM,
      ultimaMilla: s.ultimaMilla,
        nodoA: s.nodoA,
        nodoB: s.nodoB,
        nodoOLT: s.nodoOLT,
        diagramaRed: s.diagramaRed,
        status: s.status || 'Activo',
        createdAt: s.createdAt || null,
        updatedAt: s.updatedAt || null,
      })),
    };
  }

  @Get('debug-status')
async debugStatus() {
  const all = await this.serviceService.findAll();
  const statusValues = [...new Set(all.map((s: any) => ({ 
    status: s.status, 
    name: s.name 
  })))];
  return { 
    total: all.length,
    uniqueStatus: statusValues 
  };
}
  @Post()
  async createService(@Body() body: ServiceDto) {
    return await this.serviceService.createService(body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: any,
    @Req() req: any
  ) {
    return await this.serviceService.updateService(id, updateServiceDto, req);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.serviceService.findServiceById(new ObjectId(id));
  }

  @Delete(':id')
  async remove(@Param('id') id: string , @Req() req: Request) {
    console.log('️ [BACKEND] Eliminando usuario con ID:', id);
    return await this.serviceService.removeService(id, req);
  }
}