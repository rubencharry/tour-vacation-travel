import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ContactEmailDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  planTitle?: string;
}
