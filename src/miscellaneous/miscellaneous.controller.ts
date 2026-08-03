import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { MiscellaneousService } from './miscellaneous.service';
import { CreateMiscellaneousDto } from './dto/create-miscellaneous.dto';
import { UpdateMiscellaneousDto } from './dto/update-miscellaneous.dto';
import { CategoryFilterDto } from './dto/categoryFilter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';


@Controller('miscellaneous')
@UseGuards(JwtAuthGuard)
export class MiscellaneousController {
  constructor(private readonly miscellaneousService: MiscellaneousService) {}

  @Post()
  create(@Body() createDto: CreateMiscellaneousDto) {
    console.log('📥 [CONTROLLER] Datos recibidos:', createDto);
    return this.miscellaneousService.create(createDto);
  }

    @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('valor') valor?: string,
    @Query('categoria') categoria?: string,
    @Query('padreId') padreId?: string,
    @Query('activo') activo?: string,
  ) {
    console.log('📥 [CONTROLLER] Parámetros recibidos:', { page, limit, valor, categoria, padreId, activo });
    
    const result = await this.miscellaneousService.findAllPaginated(
      Number(page),
      Number(limit),
      { valor, categoria, padreId, activo }
    );

    console.log('📤 [CONTROLLER] Resultado:', {
      total: result.total,
      dataLength: result.data.length,
      page: result.page,
      totalPages: result.totalPages
    });

    return result;
  }

  @Get(':id')
  findOne(
    @Param('id') id: string)
     {
    return this.miscellaneousService.findOne(id);
  }

  @Get(':id/with-parents')
  async findOneWithParents(@Param('id') id: string) {

    const item = await this.miscellaneousService.findOne(id);
    if (!item.padreId) {
      return {... item, padre: null}; // Retorna un objeto con un arreglo vacío si no se encuentra el item
    }
    const padre = await this.miscellaneousService.findOne(item.padreId.toString());
    return {... item, padre};
  }

  @Put(':id')
    async update(
      @Param('id') id: string, 
      @Body() updateMiscellaneousDto: UpdateMiscellaneousDto,
      @Req() req: Request
    ) {
    
      return await this.miscellaneousService.update(id, updateMiscellaneousDto,req); 
    }
  

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.miscellaneousService.remove(id);
  }
}
