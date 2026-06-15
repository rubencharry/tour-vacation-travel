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
  priceUsd!: number;

  @IsString()
  description!: string;

  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls!: string[];

  @IsBoolean()
  active!: boolean;

  @IsInt()
  @Min(0)
  displayOrder!: number;
}
