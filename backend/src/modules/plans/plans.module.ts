import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PlansRepository } from './plans.repository';
import { FileModule } from '../file/file.module';

@Module({
  imports: [FileModule],
  controllers: [PlansController],
  providers: [PlansService, PlansRepository],
})
export class PlansModule {}
