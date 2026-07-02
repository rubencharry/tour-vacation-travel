import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { FileModule } from '../file/file.module';

@Module({
  imports: [FileModule],
  controllers: [MediaController],
})
export class MediaModule {}
