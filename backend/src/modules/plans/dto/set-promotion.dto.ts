import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { PromotionType } from '../entities/plan.entity';

export class SetPromotionDto {
  @IsEnum(['dos_x_uno', 'precio_especial', 'cupos_limitados', 'texto_libre'])
  type: PromotionType;

  @IsString()
  @MaxLength(300)
  label: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsBoolean()
  active: boolean;
}
