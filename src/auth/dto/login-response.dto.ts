import { ObjectId } from 'mongodb';

export class LoginResponseDto {
  access_token: string;
  user: {
    _id: ObjectId;
    email: string;
    primerNombre: string;
    segundoNombre?: string;
    primerApellido: string;
    segundoApellido?: string;
  };
}
