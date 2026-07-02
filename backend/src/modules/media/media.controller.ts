import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { FileService } from '../file/file.service';
import { ImageDto } from '../../core/dto/image.dto';
import { BucketFolders } from '../../core/enums/bucket-folders.enum';

@Controller('admin/media')
export class MediaController {
  constructor(private readonly fileSvc: FileService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  async upload(@Body() dto: ImageDto) {
    const { publicUrl } = await this.fileSvc.saveBase64(
      dto.file,
      dto.extension,
      BucketFolders.PLANS,
    );
    return { publicUrl };
  }
}
