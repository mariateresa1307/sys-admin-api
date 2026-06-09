import { IsOptional, IsString } from 'class-validator';

export class UpdateTicketDto {
  @IsString()
  @IsOptional()
  caseNumber?: string;

  @IsString()
  @IsOptional()
  incidentType?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  networkCategory?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
