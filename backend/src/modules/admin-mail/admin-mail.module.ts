import { Module } from '@nestjs/common';
import { AdminMailController } from './admin-mail.controller';
import { MailModule } from '../mail/mail.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [MailModule, LeadsModule],
  controllers: [AdminMailController],
})
export class AdminMailModule {}
