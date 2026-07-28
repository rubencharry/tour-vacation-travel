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
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateLeadActivityDto } from './dto/create-lead-activity.dto';
import { ContactEmailDto } from './dto/contact-email.dto';
import { BulkContactEmailDto } from './dto/bulk-contact-email.dto';
import { Public } from '../auth/public.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user';

@Controller('leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateLeadDto, @CurrentUser() actor?: AuthenticatedUser) {
    return this.service.create(dto, actor?.email);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/activities')
  addActivity(
    @Param('id') id: string,
    @Body() dto: CreateLeadActivityDto,
    @CurrentUser() actor?: AuthenticatedUser,
  ) {
    return this.service.addActivity(id, dto, actor?.email);
  }

  @Post(':id/contact-email')
  sendContactEmail(
    @Param('id') id: string,
    @Body() dto: ContactEmailDto,
    @CurrentUser() actor?: AuthenticatedUser,
  ) {
    return this.service.sendContactEmail(id, dto, actor?.email);
  }

  @Post('bulk-contact-email')
  sendBulkContactEmail(
    @Body() dto: BulkContactEmailDto,
    @CurrentUser() actor?: AuthenticatedUser,
  ) {
    return this.service.sendBulkContactEmail(dto, actor?.email);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
