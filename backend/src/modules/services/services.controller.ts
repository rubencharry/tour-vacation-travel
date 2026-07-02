import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { SERVICES_CATALOG, ServiceItem } from './services.catalog';

@Controller('services')
export class ServicesController {
  @Public()
  @Get()
  findAll(): ServiceItem[] {
    return SERVICES_CATALOG;
  }
}
