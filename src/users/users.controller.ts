import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get() 
  async findAll() {
    return await this.usersService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req: any): Promise<UserResponseDto> {

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
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.usersService.updateUser(id, updateUserDto); 
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
    return await this.usersService.remove(id);
  }
}