import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { ObjectId } from 'mongodb';

const ROLES_VALIDOS = ['admin', 'operador', 'editor'];

@Injectable()
export class UsersService {
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
    console.log("📥 [CREATE USER] Datos recibidos:", userData);

    try {
      if (!userData.clave || typeof userData.clave !== 'string') {
        throw new BadRequestException('La contraseña es requerida');
      }

      if (!userData.primerNombre) {
        throw new BadRequestException('El primer nombre es requerido');
      }

      const existingUser = await this.userRepository.findOne({
        where: {
          $or: [
            { username: userData.username },
            { email: userData.email }
          ]
        } as any
      });

      if (existingUser) {
        throw new ConflictException('El nombre de usuario o email ya está en uso');
      }

      const role = userData.role || 'operador';
      if (!ROLES_VALIDOS.includes(role)) {
        throw new BadRequestException(`Rol de usuario no válido. Roles permitidos: ${ROLES_VALIDOS.join(', ')}`);
      }

      const hashedPassword = await bcrypt.hash(userData.clave, 10);
  
      const newUser = this.userRepository.create({
        primerNombre: userData.primerNombre!,
        primerApellido: userData.primerApellido!,
        email: userData.email!,
        username: userData.username!,
        clave: hashedPassword,
        role: role,
        segundoNombre: userData.segundoNombre,
        segundoApellido: userData.segundoApellido,
        isActive: true
      });

      console.log("📝 [CREATE USER] Guardando usuario con role:", role);
      const savedUser = await this.userRepository.save(newUser);
      console.log("✅ [CREATE USER] Usuario creado exitosamente:", savedUser._id);
      
      return savedUser;
    } catch (error) {
      console.error("❌ [CREATE USER] Error:", error);
      throw error;
    }
  }

  async searchAll(search?: string): Promise<User[]> {
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
      console.log("📥 [UPDATE USER] Datos recibidos:", data);
      
      const user = await this.userRepository.findOne({ where: { _id: new ObjectId(id) as any } });
      if (!user) throw new NotFoundException('Usuario no encontrado');

      if (!data.clave || data.clave.trim() === "") {
        delete data.clave;
      } else {
        data.clave = await bcrypt.hash(data.clave, 10);
      }

      if (!data.role) {
        data.role = user.role;
      } else {

        if (!ROLES_VALIDOS.includes(data.role)) {
          throw new BadRequestException(`Rol de usuario no válido. Roles permitidos: ${ROLES_VALIDOS.join(', ')}`);
        }
      }

      Object.assign(user, data);
      const updatedUser = await this.userRepository.save(user);

      console.log("✅ [UPDATE USER] Usuario actualizado:", updatedUser._id);
      return updatedUser;
    } catch (error) {
      console.error("❌ [UPDATE USER] Error:", error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar base de datos');
    }
  }

  async getUserRole(id: string): Promise<string> {
    const user = await this.getUserById(id);
    return user.role;
  }
}