import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LeadsRepository } from './leads.repository';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateLeadActivityDto } from './dto/create-lead-activity.dto';
import { ContactEmailDto } from './dto/contact-email.dto';
import { BulkContactEmailDto } from './dto/bulk-contact-email.dto';
import { Lead, LeadActivity, LeadStatus } from './entities/lead.entity';
import { MailService, BulkMailResult } from '../mail/mail.service';
import { leadConfirmationTemplate } from '../mail/templates/lead-confirmation.template';
import { outreachTemplate } from '../mail/templates/outreach.template';

const IDEMPOTENCY_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const BULK_CONTACT_BATCH_SIZE = 10;
const BULK_CONTACT_BATCH_DELAY_MS = 800;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly repo: LeadsRepository,
    private readonly mail: MailService,
  ) {}

  async create(dto: CreateLeadDto, actorEmail?: string): Promise<Lead> {
    const email = dto.email.toLowerCase();
    const existing = await this.findExisting(email, dto.interestedPlanId);
    if (existing) return existing;

    const createdActivity: LeadActivity = {
      id: crypto.randomUUID(),
      type: 'created',
      createdAt: new Date().toISOString(),
      actorEmail,
      note: `Origen: ${dto.source ?? 'manual'}`,
    };

    const lead: Lead = {
      leadId: crypto.randomUUID(),
      ...dto,
      email,
      createdAt: new Date().toISOString(),
      emailSent: false,
      status: 'nuevo',
      activities: [createdActivity],
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

  async addActivity(
    leadId: string,
    dto: CreateLeadActivityDto,
    actorEmail?: string,
  ): Promise<Lead> {
    const lead = await this.findOne(leadId);

    const activity: LeadActivity = {
      id: crypto.randomUUID(),
      type: dto.type,
      createdAt: new Date().toISOString(),
      actorEmail,
      note: dto.note,
      status: dto.type === 'status_changed' ? dto.status : undefined,
      channel: dto.type === 'contacted' ? dto.channel : undefined,
    };

    let newStatus: LeadStatus | undefined;
    if (dto.type === 'status_changed') {
      newStatus = dto.status;
    } else if (
      dto.type === 'contacted' &&
      (lead.status ?? 'nuevo') === 'nuevo'
    ) {
      // Primer contacto: avanza automáticamente de "nuevo" a "contactado".
      // Si ya estaba más adelante en el pipeline, no lo retrocede.
      newStatus = 'contactado';
    }

    return this.repo.addActivity(leadId, activity, newStatus);
  }

  async sendContactEmail(
    leadId: string,
    dto: ContactEmailDto,
    actorEmail?: string,
  ): Promise<Lead> {
    const lead = await this.findOne(leadId);
    const { subject, html } = outreachTemplate({
      name: lead.name,
      planTitle: dto.planTitle,
    });
    await this.mail.send({ to: lead.email, subject, html });

    return this.addActivity(
      leadId,
      { type: 'contacted', channel: 'email' },
      actorEmail,
    );
  }

  async sendBulkContactEmail(
    dto: BulkContactEmailDto,
    actorEmail?: string,
  ): Promise<BulkMailResult> {
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < dto.leads.length; i += BULK_CONTACT_BATCH_SIZE) {
      const batch = dto.leads.slice(i, i + BULK_CONTACT_BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((item) =>
          this.sendContactEmail(
            item.leadId,
            { planTitle: item.planTitle },
            actorEmail,
          ),
        ),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') sent++;
        else {
          failed++;
          this.logger.error(
            `Bulk contact email failed: ${String(result.reason)}`,
          );
        }
      }

      if (i + BULK_CONTACT_BATCH_SIZE < dto.leads.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, BULK_CONTACT_BATCH_DELAY_MS),
        );
      }
    }

    return { sent, failed, total: dto.leads.length };
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
