import { IsBoolean } from 'class-validator';

export class UserfilterDTO {
  @IsBoolean()
  isActive?: boolean;
}
