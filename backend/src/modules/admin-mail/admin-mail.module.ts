import { Module } from '@nestjs/common';
import { AdminMailController } from './admin-mail.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [AdminMailController],
})
export class AdminMailModule {}
