import { IsEmail, IsString, IsOptional, IsBoolean, IsIn, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  primerNombre?: string;

  @IsString()
  @IsOptional()
  segundoNombre?: string;

  @IsString()
  primerApellido?: string;

  @IsString()
  @IsOptional()
  segundoApellido?: string;

  @IsEmail()
  email?: string;

  @IsString()
  username?: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' }) 
  @IsOptional()
  clave?: string;

  @IsString()
  @IsIn(['admin', 'operador', 'editor'])
  @IsOptional()
  role?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}