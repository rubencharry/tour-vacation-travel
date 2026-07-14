import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { MailService } from '../mail/mail.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { SendBulkMailDto } from './dto/send-bulk-mail.dto';
import { promotionTemplate } from '../mail/templates/promotion.template';
import { Public } from '../auth/public.decorator';

@Controller('leads')
export class LeadsController {
  constructor(
    private readonly service: LeadsService,
    private readonly mail: MailService,
  ) {}

  @Public()
  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
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
