import { IsBase64, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ImageDto {
  @IsBase64()
  @IsNotEmpty()
  file: string; // base64 sin prefijo "data:image/...;base64,"

  @IsNotEmpty()
  @IsString()
  extension: string; // "jpg", "png", "webp"

  @IsOptional()
  @IsString()
  name?: string; // solo para assets con nombre fijo
}
