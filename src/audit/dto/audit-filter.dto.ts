import { IsOptional, IsMongoId, IsDateString, IsString } from 'class-validator';

export class AuditFilterDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  action?: string;
}
