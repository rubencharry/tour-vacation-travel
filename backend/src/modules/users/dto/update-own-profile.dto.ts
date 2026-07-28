import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOwnProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
