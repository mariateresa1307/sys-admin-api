import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'El correo es requerido' })
  @IsEmail({}, { message: 'El correo debe ser un email válido' })
  correo: string;

  @IsNotEmpty({ message: 'La clave es requerida' })
  @IsString()
  @MinLength(6, { message: 'La clave debe tener al menos 6 caracteres' })
  clave: string;
}
