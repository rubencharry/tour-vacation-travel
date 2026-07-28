import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { LEAD_STATUSES } from '../entities/lead.entity';
import type { LeadActivityType, LeadStatus } from '../entities/lead.entity';

const ACTIVITY_TYPES: LeadActivityType[] = [
  'status_changed',
  'contacted',
  'note',
];
const CONTACT_CHANNELS = ['whatsapp', 'email'] as const;

export class CreateLeadActivityDto {
  @IsIn(ACTIVITY_TYPES)
  type!: LeadActivityType;

  @ValidateIf((dto: CreateLeadActivityDto) => dto.type === 'status_changed')
  @IsIn(LEAD_STATUSES)
  status?: LeadStatus;

  @ValidateIf((dto: CreateLeadActivityDto) => dto.type === 'contacted')
  @IsIn(CONTACT_CHANNELS)
  channel?: 'whatsapp' | 'email';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
