import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateLeadDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  interestedPlanId: string;

  @IsOptional()
  @IsString()
  source?: string;
}
