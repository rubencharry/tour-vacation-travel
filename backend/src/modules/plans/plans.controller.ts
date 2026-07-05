import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { GetPlansQueryDto } from './dto/get-plans-query.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import { Public } from '../auth/public.decorator';

@Controller('plans')
export class PlansController {
  constructor(private readonly service: PlansService) {}

  @Post('upload-image')
  @HttpCode(HttpStatus.OK)
  uploadImage(@Body() dto: UploadImageDto) {
    return this.service.uploadImage(dto.file, dto.extension);
  }

  @Post()
  create(@Body() dto: CreatePlanDto) {
    return this.service.create(dto);
  }

  @Public()
  @Get()
  findAll(@Query() query: GetPlansQueryDto) {
    return this.service.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
