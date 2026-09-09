import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { LEAD_SOURCES } from '../entities/lead.entity';
import type { LeadSource } from '../entities/lead.entity';

export class CreateLeadDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Matches(/^[a-zA-ZÀ-ÿ\s\-'.]+$/, {
    message: 'name must contain only letters and spaces',
  })
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

  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  message!: string;

  /** Honeypot: must be empty. Bots fill it, humans never see it. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  _hp?: string;
}
