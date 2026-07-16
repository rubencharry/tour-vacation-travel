import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { LEAD_SOURCES } from '../entities/lead.entity';
import type { LeadSource } from '../entities/lead.entity';

export class CreateLeadDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @MaxLength(100)
  interestedPlanId!: string;

  @IsOptional()
  @IsIn(LEAD_SOURCES)
  source?: LeadSource;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;
}
