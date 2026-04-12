import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt'; // Asegúrate de tener instalado: npm install bcrypt
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  [x: string]: any;
  async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }
  
  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      // Opcional: selecciona solo los campos que necesitas mostrar
      order: { primerNombre: 'ASC' } 
    });
  }
  
  async findUserByEmail(email: string): Promise<User| null> {
    return await this.userRepository.findOne({ where: { email } });
  }
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(userData: Partial<User>): Promise<User> {
    
    const existingUser = await this.userRepository.findOne({ 
      where: { username: userData.username } 
    });

    if (existingUser) {
      throw new ConflictException('El nombre de usuario ya está en uso');
    }

    
 
    const newUser = this.userRepository.create({
      ...userData,
      isActive: true
    });

    return await this.userRepository.save(newUser);
  }

  async searchAll(search?: string): Promise<User[]> {
    // Si no hay búsqueda, retorna todos los activos
    if (!search) {
      return await this.userRepository.find({ 
        where: { isActive: true },
        order: { primerNombre: 'ASC' } 
      });
    }

   
    return await this.userRepository.find({
      where: [
        { username: Like(`%${search}%`), isActive: true },
        { email: Like(`%${search}%`), isActive: true },
        { primerNombre: Like(`%${search}%`), isActive: true },
        { primerApellido: Like(`%${search}%`), isActive: true },
      ],
      order: { primerNombre: 'ASC' }
    });
  }



  async setStatus(id: string, status: boolean): Promise<User> {
    const user = await this.getUserById(id);
    user.isActive = status;
    return await this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.getUserById(id);
    user.isActive = false; // Borrado lógico profesional
    await this.userRepository.save(user);
  }

  async validateUserPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }
 
  async updateUser(id: string, data: any) {
  try {
    // 1. Buscamos si el usuario existe
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // 2. IMPORTANTE: Si la clave viene vacía, no la actualizamos
    if (!data.clave || data.clave.trim() === "") {
      delete data.clave;
    } else {
      // Si usas hashing (bcrypt), aquí deberías encriptar data.clave
    }

    // 3. Actualizamos solo los campos permitidos
    Object.assign(user, data);
    return await this.userRepository.save(user);
  } catch (error) {
    console.error("Error en Service updateUser:", error);
    throw new InternalServerErrorException('Error al actualizar base de datos');
  }
}

}