import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class BulkContactEmailItemDto {
  @IsString()
  @IsNotEmpty()
  leadId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  planTitle?: string;
}

export class BulkContactEmailDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkContactEmailItemDto)
  leads: BulkContactEmailItemDto[];
}
