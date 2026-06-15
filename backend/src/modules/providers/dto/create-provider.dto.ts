import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { OperatorType, ProviderStatus } from '../entities/provider.entity';

export class CreateProviderDto {
  @IsEnum(['mayorista', 'operador'] as const)
  operatorType: OperatorType;

  @IsString()
  businessName: string;

  @IsString()
  nit: string;

  @IsString()
  mainContact: string;

  @IsString()
  contactRole: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionPct?: number;

  @IsEnum(['activo', 'inactivo'] as const)
  status: ProviderStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @IsString({ each: true })
  services: string[];
}
