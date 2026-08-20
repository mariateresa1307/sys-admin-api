import {  Controller,  Get,  Post,  Body,  Patch,  Param,  Delete, UseGuards, Put, Query, Req, HttpCode, HttpStatus} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';




@Controller('user')
@UseGuards(JwtAuthGuard) 
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

@Get()
async findAll(
  @Query('page') page?: string,
  @Query('limit') limit?: string,
  @Query('isActive') isActive?: string,
  @Query('search') search?: string,
) {
  console.log('📥 [UsersController] Parámetros recibidos:', {
    page,
    limit,
    isActive,
    search
  });

  if (page !== undefined || limit !== undefined || search !== undefined) {
    const filters: any = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (search) filters.search = search;

    const result = await this.usersService.findAllPaginated(
      Number(page) || 1,
      Number(limit) || 10,
      filters,
    );

    console.log('📤 [UsersController] Resultado:', {
      total: result.total,
      dataLength: result.data.length,
      page: result.page,
      totalPages: result.totalPages
    });

    return result;
  }

  return this.usersService.findAll({
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
  } as any);
}


  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Req() req: any): Promise<UserResponseDto> {
    const user = await this.usersService.getUserById(req.user._id);

    return {
      _id: user._id.toString(), 
      email: user.email,
      primerNombre: user.primerNombre,
      segundoNombre: user.segundoNombre,
      primerApellido: user.primerApellido,
      segundoApellido: user.segundoApellido,
      username: user.username ?? '',
      role: user.role ?? 'user',
      isActive: user.isActive,
    };
  }

 @Post()
async create(@Body() createUserDto: CreateUserDto) {
  
  try {
    const result = await this.usersService.createUser(createUserDto);

    return {
      message: 'Usuario creado exitosamente',
      user: {
        _id: result._id.toString(),
        email: result.email,
        primerNombre: result.primerNombre,
        segundoNombre: result.segundoNombre,
        primerApellido: result.primerApellido,
        segundoApellido: result.segundoApellido,
        username: result.username,
        role: result.role,
        isActive: result.isActive,
      }
    };
  } catch (error) {
    throw error;
  }
}

  @Put(':id')
  async update(@Param('id') id: string, 
  @Body() updateUserDto: UpdateUserDto,
   @Req() req: Request
) {
    return await this.usersService.updateUser(id, updateUserDto, req); 
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean
  ) {
    return await this.usersService.setStatus(id, isActive);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    console.log('️ [BACKEND] Eliminando usuario con ID:', id);
    return await this.usersService.deleteUser(id);
  }
}