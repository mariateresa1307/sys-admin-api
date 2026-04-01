export class LoginResponseDto {
  access_token: string;
  user: {
    id: string;
    correo: string;
    primerNombre: string;
    segundoNombre?: string;
    primerApellido: string;
    segundoApellido?: string;
  };
}
