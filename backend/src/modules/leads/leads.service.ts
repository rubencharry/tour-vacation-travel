import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LeadsRepository } from './leads.repository';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateLeadActivityDto } from './dto/create-lead-activity.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';
import { Lead, LeadActivity, LeadStatus } from './entities/lead.entity';
import { MailService, BulkMailResult } from '../mail/mail.service';
import { leadConfirmationTemplate } from '../mail/templates/lead-confirmation.template';
import { planCampaignTemplate } from '../mail/templates/plan-campaign.template';
import { PlansRepository } from '../plans/plans.repository';
import { PlansService } from '../plans/plans.service';
import { FileService } from '../file/file.service';

const IDEMPOTENCY_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const BULK_CONTACT_BATCH_SIZE = 10;
const BULK_CONTACT_BATCH_DELAY_MS = 800;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  private readonly siteUrl: string;

  constructor(
    private readonly repo: LeadsRepository,
    private readonly mail: MailService,
    private readonly plansRepo: PlansRepository,
    private readonly plansService: PlansService,
    private readonly fileService: FileService,
    config: ConfigService,
  ) {
    this.siteUrl = config.get<string>('APP_URL', 'http://localhost:4200');
  }

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

    // await es necesario en Lambda: el proceso se congela al retornar el handler
    // y el fire-and-forget nunca llega a ejecutarse
    await this.sendConfirmation(lead).catch((err) =>
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

  private async sendConfirmation(lead: Lead): Promise<void> {
    const allPlans = await this.plansRepo.findAll();
    const featuredPlans = allPlans
      .filter((p) => p.active)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .slice(0, 3)
      .map((p) => ({
        title: p.title,
        price: p.price,
        currency: p.currency,
        durationDays: p.durationDays,
        durationNights: p.durationNights,
        imageUrls: this.fileService.presignImageUrls(p.imageUrls ?? []),
        departureCity: p.departureCity,
        inclusions: p.inclusions,
      }));

    const { subject, html } = leadConfirmationTemplate({
      name: lead.name,
      featuredPlans,
      siteUrl: this.siteUrl,
    });
    await this.mail.send({ to: lead.email, subject, html });
    await this.repo.markEmailSent(lead.leadId);
  }

  async sendCampaign(
    dto: SendCampaignDto,
    actorEmail?: string,
  ): Promise<BulkMailResult> {
    const plan = await this.plansService.findOne(dto.planId);
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < dto.leadIds.length; i += BULK_CONTACT_BATCH_SIZE) {
      const batch = dto.leadIds.slice(i, i + BULK_CONTACT_BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (leadId) => {
          const lead = await this.findOne(leadId);
          const { subject, html } = planCampaignTemplate({
            recipientName: lead.name,
            plan,
            siteUrl: this.siteUrl,
          });
          await this.mail.send({ to: lead.email, subject, html });
          await this.addActivity(
            leadId,
            { type: 'contacted', channel: 'email' },
            actorEmail,
          );
        }),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') sent++;
        else {
          failed++;
          this.logger.error(`Campaign email failed: ${String(result.reason)}`);
        }
      }

      if (i + BULK_CONTACT_BATCH_SIZE < dto.leadIds.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, BULK_CONTACT_BATCH_DELAY_MS),
        );
      }
    }

    return { sent, failed, total: dto.leadIds.length };
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
