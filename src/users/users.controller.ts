import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
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
    const user = await this.usersService.getUserById(req.user.id);
    return {
      id: user.id,
      email: user.email,
      primerNombre: user.primerNombre,
      segundoNombre: user.segundoNombre,
      primerApellido: user.primerApellido,
      segundoApellido: user.segundoApellido,
      username: user.username,
      
    };

    
  }

  @Post()
  async create(@Body() createUserDto: any) {
    return await this.usersService.createUser(createUserDto);
  }

@Put(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: any) {
    console.log('Actualizando usuario:', id, 'con datos:', updateUserDto);
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
