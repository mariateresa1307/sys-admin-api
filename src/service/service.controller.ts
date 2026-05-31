import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ServiceService } from '../service/service.service';
import { ServiceResponseDto } from './dto/service-response.dto'; // Tu DTO
import { ObjectId } from 'mongodb';

@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

@Post()
  async createService(@Body() createServiceDto: ServiceResponseDto) {
    return await this.serviceService.createService(createServiceDto);
  }
  
  @Get(':id')
  async findOne(@Param('id') id: string) {
    // Convertimos el string a ObjectId aquí mismo
    return await this.serviceService.findServiceById(new ObjectId(id));
  }
  
}