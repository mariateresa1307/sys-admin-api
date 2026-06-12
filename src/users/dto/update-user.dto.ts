import { IsEmail, IsString, IsOptional, IsBoolean, IsIn, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  primerNombre?: string;

  @IsString()
  @IsOptional()
  segundoNombre?: string;

  @IsString()
  @IsOptional()
  primerApellido?: string;

  @IsString()
  @IsOptional()
  segundoApellido?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @MinLength(6)
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