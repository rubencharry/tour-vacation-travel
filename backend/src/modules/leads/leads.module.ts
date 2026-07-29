import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadsRepository } from './leads.repository';
import { MailModule } from '../mail/mail.module';
import { PlansModule } from '../plans/plans.module';
import { FileModule } from '../file/file.module';

@Module({
  imports: [MailModule, PlansModule, FileModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadsRepository],
  exports: [LeadsService],
})
export class LeadsModule {}
