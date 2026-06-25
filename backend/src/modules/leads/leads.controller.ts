import { Body, Controller, Get, Post } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { MailService } from '../mail/mail.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { SendBulkMailDto } from './dto/send-bulk-mail.dto';
import { promotionTemplate } from '../mail/templates/promotion.template';

@Controller('leads')
export class LeadsController {
  constructor(
    private readonly service: LeadsService,
    private readonly mail: MailService,
  ) {}

  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post('bulk-mail')
  async sendBulkMail(@Body() dto: SendBulkMailDto) {
    const leads = await this.service.findAll();

    const recipients = leads
      .filter((l) => !dto.planId || l.interestedPlanId === dto.planId)
      .map((l) => l.email);

    const { subject, html } = promotionTemplate(dto.templateData);
    return this.mail.sendBulk(recipients, subject, html);
  }
}
