import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  title!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsString()
  currency!: string;

  @IsString()
  priceDetails!: string;

  @IsString()
  description!: string;

  @IsInt()
  @Min(0)
  durationDays!: number;

  @IsInt()
  @Min(0)
  durationNights!: number;

  @IsString()
  validity!: string;

  @IsString()
  departureCity!: string;

  @IsArray()
  @IsString({ each: true })
  inclusions!: string[];

  @IsString()
  terms!: string;

  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls!: string[];

  @IsBoolean()
  active!: boolean;
}
