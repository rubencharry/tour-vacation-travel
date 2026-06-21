import { Injectable, Logger } from '@nestjs/common';
import { LeadsRepository } from './leads.repository';
import { CreateLeadDto } from './dto/create-lead.dto';
import { Lead } from './entities/lead.entity';
import { MailService } from '../mail/mail.service';
import { leadConfirmationTemplate } from '../mail/templates/lead-confirmation.template';

const IDEMPOTENCY_WINDOW_MS = 60 * 60 * 1000; // 1 hora

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly repo: LeadsRepository,
    private readonly mail: MailService,
  ) {}

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

    this.sendConfirmation(lead).catch((err) =>
      this.logger.error(`Email confirmation failed for ${lead.leadId}: ${err}`),
    );

    return lead;
  }

  async findAll(): Promise<Lead[]> {
    return this.repo.findAll();
  }

  private async sendConfirmation(lead: Lead): Promise<void> {
    const { subject, html } = leadConfirmationTemplate({ name: lead.name });
    await this.mail.send({ to: lead.email, subject, html });
    await this.repo.markEmailSent(lead.leadId);
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
