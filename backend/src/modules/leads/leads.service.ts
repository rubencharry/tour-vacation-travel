import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LeadsRepository } from './leads.repository';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
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
    const email = dto.email.toLowerCase();
    const existing = await this.findExisting(email, dto.interestedPlanId);
    if (existing) return existing;

    const lead: Lead = {
      leadId: crypto.randomUUID(),
      ...dto,
      email,
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

  async findOne(leadId: string): Promise<Lead> {
    const lead = await this.repo.findById(leadId);
    if (!lead) throw new NotFoundException(`Lead ${leadId} no encontrado`);
    return lead;
  }

  async update(leadId: string, dto: UpdateLeadDto): Promise<Lead> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No hay campos para actualizar');
    }
    await this.findOne(leadId);
    const updates = dto.email
      ? { ...dto, email: dto.email.toLowerCase() }
      : dto;
    return this.repo.update(leadId, updates);
  }

  async remove(leadId: string): Promise<void> {
    await this.findOne(leadId);
    await this.repo.delete(leadId);
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
    const leads = await this.repo.findByEmail(email.toLowerCase());
    const cutoff = Date.now() - IDEMPOTENCY_WINDOW_MS;
    return leads.find(
      (l) =>
        l.interestedPlanId === planId &&
        new Date(l.createdAt).getTime() > cutoff,
    );
  }
}
