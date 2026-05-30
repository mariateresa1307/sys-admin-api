import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { ObjectId } from 'mongodb';

@Injectable()
export class UsersService {
  [x: string]: any;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findUserById(id: string): Promise<User> {

    const user = await this.userRepository.findOne({ where: { _id: new ObjectId(id) } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      order: { primerNombre: 'ASC' }
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

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
        { username: Like(`%${search}%`) },
        { email: Like(`%${search}%`) },
        { primerNombre: Like(`%${search}%`) },
        { primerApellido: Like(`%${search}%`) },
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
    user.isActive = false; 
    await this.userRepository.save(user);
  }

  async validateUserPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { _id: new ObjectId(id) as any } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }
 
  async updateUser(id: string, data: any) {
    try {
      const user = await this.userRepository.findOne({ where: { _id: new ObjectId(id) as any } });
      if (!user) throw new NotFoundException('Usuario no encontrado');

      if (!data.clave || data.clave.trim() === "") {
        delete data.clave;
      } else {
      }
      Object.assign(user, data);
      return await this.userRepository.save(user);
    } catch (error) {
      console.error("Error en Service updateUser:", error);
      throw new InternalServerErrorException('Error al actualizar base de datos');
    }
  }
}