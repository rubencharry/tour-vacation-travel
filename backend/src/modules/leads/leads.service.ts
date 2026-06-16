import { Injectable } from '@nestjs/common';
import { LeadsRepository } from './leads.repository';
import { CreateLeadDto } from './dto/create-lead.dto';
import { Lead } from './entities/lead.entity';

const IDEMPOTENCY_WINDOW_MS = 60 * 60 * 1000; // 1 hora

@Injectable()
export class LeadsService {
  constructor(private readonly repo: LeadsRepository) {}

  async create(dto: CreateLeadDto): Promise<Lead> {
    const existing = await this.findExisting(dto.email, dto.interestedPlanId);
    if (existing) return existing;

    const lead: Lead = {
      leadId: crypto.randomUUID(),
      ...dto,
      createdAt: new Date().toISOString(),
      emailSent: false,
    };
    await this.repo.put(lead);
    return lead;
  }

  async findAll(): Promise<Lead[]> {
    return this.repo.findAll();
  }

  private async findExisting(
    email: string,
    planId: string,
  ): Promise<Lead | undefined> {
    const leads = await this.repo.findByEmail(email);
    const cutoff = Date.now() - IDEMPOTENCY_WINDOW_MS;
    return leads.find(
      (l) =>
        l.interestedPlanId === planId &&
        new Date(l.createdAt).getTime() > cutoff,
    );
  }
}
