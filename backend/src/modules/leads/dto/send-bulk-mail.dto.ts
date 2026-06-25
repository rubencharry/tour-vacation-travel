import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PromotionDataDto {
  @IsString()
  @IsNotEmpty()
  heading: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsString()
  ctaText?: string;

  @IsOptional()
  @IsUrl()
  ctaUrl?: string;
}

export class SendBulkMailDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PromotionDataDto)
  templateData: PromotionDataDto;
}
