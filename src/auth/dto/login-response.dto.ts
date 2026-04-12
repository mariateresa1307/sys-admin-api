export class LoginResponseDto {
  access_token: string;
  user: {
    id: string;
    email: string;
    primerNombre: string;
    segundoNombre?: string;
    primerApellido: string;
    segundoApellido?: string;
  };
}
