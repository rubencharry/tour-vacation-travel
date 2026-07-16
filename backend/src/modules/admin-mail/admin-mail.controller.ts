import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { LeadsService } from '../leads/leads.service';
import { SendMailDto } from '../mail/dto/send-mail.dto';
import { SendBulkMailDto } from '../leads/dto/send-bulk-mail.dto';
import { promotionTemplate } from '../mail/templates/promotion.template';
import { BulkMailResult } from '../mail/mail.service';

@Controller('admin/mail')
export class AdminMailController {
  constructor(
    private readonly mail: MailService,
    private readonly leads: LeadsService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async send(@Body() dto: SendMailDto): Promise<{ ok: boolean }> {
    await this.mail.send(dto);
    return { ok: true };
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  async sendBulk(@Body() dto: SendBulkMailDto): Promise<BulkMailResult> {
    const allLeads = await this.leads.findAll();
    const recipients = allLeads
      .filter((l) => !dto.planId || l.interestedPlanId === dto.planId)
      .map((l) => l.email);
    const { subject, html } = promotionTemplate(dto.templateData);
    return this.mail.sendBulk(recipients, subject, html);
  }
}
