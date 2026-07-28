import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { USER_STATUSES } from '../entities/user.entity';
import type { UserStatus } from '../entities/user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: UserStatus;
}
