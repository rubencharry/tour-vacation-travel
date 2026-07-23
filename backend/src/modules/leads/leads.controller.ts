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
import { SendCampaignDto } from './dto/send-campaign.dto';
import { Public } from '../auth/public.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateLeadDto, @CurrentUser() actorEmail?: string) {
    return this.service.create(dto, actorEmail);
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
    @CurrentUser() actorEmail?: string,
  ) {
    return this.service.addActivity(id, dto, actorEmail);
  }

  @Post('send-campaign')
  sendCampaign(
    @Body() dto: SendCampaignDto,
    @CurrentUser() actorEmail?: string,
  ) {
    return this.service.sendCampaign(dto, actorEmail);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
