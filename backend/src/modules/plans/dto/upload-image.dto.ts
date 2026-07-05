import { IsBase64, IsNotEmpty, IsString } from 'class-validator';

export class UploadImageDto {
  @IsBase64()
  @IsNotEmpty()
  file: string;

  @IsNotEmpty()
  @IsString()
  extension: string;
}
