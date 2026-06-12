import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
} from '@nestjs/common';
import { MiscellaneousService } from './miscellaneous.service';
import { CreateMiscellaneousDto } from './dto/create-miscellaneous.dto';
import { UpdateMiscellaneousDto } from './dto/update-miscellaneous.dto';
import { CategoryFilterDto } from './dto/categoryFilter.dto';

@Controller('miscellaneous')
export class MiscellaneousController {
  constructor(private readonly miscellaneousService: MiscellaneousService) {}

  @Post()
  create(@Body() createDto: CreateMiscellaneousDto) {
    console.log('Datos recibidos:', createDto);
    return this.miscellaneousService.create(createDto);
  }

  @Get()
  findAll(@Query() filtro: CategoryFilterDto) {
    return this.miscellaneousService.findAll(filtro);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.miscellaneousService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateMiscellaneousDto) {
    console.log('Actualizando ID:', id, 'con datos:', updateDto);
    return this.miscellaneousService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.miscellaneousService.remove(id);
  }
}
