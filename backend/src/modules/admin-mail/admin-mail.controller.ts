import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { SendMailDto } from '../mail/dto/send-mail.dto';

@Controller('admin/mail')
export class AdminMailController {
  constructor(private readonly mail: MailService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async send(@Body() dto: SendMailDto): Promise<{ ok: boolean }> {
    await this.mail.send(dto);
    return { ok: true };
  }
}
