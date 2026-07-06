import { Injectable, NotFoundException } from '@nestjs/common';
import { ProvidersRepository } from './providers.repository';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { Provider } from './entities/provider.entity';

@Injectable()
export class ProvidersService {
  constructor(private readonly repo: ProvidersRepository) {}

  async create(dto: CreateProviderDto): Promise<Provider> {
    const provider: Provider = {
      providerId: crypto.randomUUID(),
      registrationDate: new Date().toISOString(),
      ...dto,
    };
    await this.repo.put(provider);
    return provider;
  }

  async findAll(): Promise<Provider[]> {
    return this.repo.findAll();
  }

  async findOne(providerId: string): Promise<Provider> {
    const provider = await this.repo.findById(providerId);
    if (!provider)
      throw new NotFoundException(`Proveedor ${providerId} no encontrado`);
    return provider;
  }

  async update(providerId: string, dto: UpdateProviderDto): Promise<Provider> {
    await this.findOne(providerId);
    return this.repo.update(providerId, dto);
  }

  async remove(providerId: string): Promise<void> {
    await this.findOne(providerId);
    await this.repo.delete(providerId);
  }
}
