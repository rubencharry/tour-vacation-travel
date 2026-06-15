import { Module } from '@nestjs/common';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { ProvidersRepository } from './providers.repository';

@Module({
  controllers: [ProvidersController],
  providers: [ProvidersService, ProvidersRepository],
})
export class ProvidersModule {}
