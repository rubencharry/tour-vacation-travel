import { Injectable, NotFoundException } from '@nestjs/common';
import { PlansRepository } from './plans.repository';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { GetPlansQueryDto } from './dto/get-plans-query.dto';
import { SetPromotionDto } from './dto/set-promotion.dto';
import { Plan, PlanType } from './entities/plan.entity';
import { FileService } from '../file/file.service';

@Injectable()
export class PlansService {
  constructor(
    private readonly repo: PlansRepository,
    private readonly fileService: FileService,
  ) {}

  async create(dto: CreatePlanDto): Promise<Plan> {
    const now = new Date().toISOString();
    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      const existing = await this.repo.findAll();
      const max = existing.reduce(
        (m, p) => Math.max(m, p.displayOrder ?? 0),
        0,
      );
      displayOrder = max + 1;
    }
    const plan: Plan = {
      planId: crypto.randomUUID(),
      ...dto,
      displayOrder,
      imageUrls: dto.imageUrls.map((u) => this.fileService.extractS3Key(u)),
      planType: dto.planType as PlanType,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.put(plan);
    return {
      ...plan,
      imageUrls: await this.fileService.presignImageUrls(plan.imageUrls),
    };
  }

  async findAll(query: GetPlansQueryDto): Promise<{ data: Plan[]; meta: any }> {
    const { page, limit, active, planType } = query;
    let all = await this.repo.findAll();

    if (active !== undefined) {
      all = all.filter((p) => p.active === active);
    }

    if (planType !== undefined) {
      all = all.filter((p) => p.planType === planType);
    }

    all.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    const totalItems = all.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const paginatedItems = all.slice(startIndex, startIndex + limit);
    const data = await this.addPresignedUrls(paginatedItems);

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async findActive(): Promise<Plan[]> {
    const all = await this.repo.findAll();
    const active = all
      .filter((p) => p.active)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    return this.addPresignedUrls(active);
  }

  async findOne(planId: string): Promise<Plan> {
    const plan = await this.repo.findById(planId);
    if (!plan) throw new NotFoundException(`Plan ${planId} no encontrado`);
    return {
      ...plan,
      imageUrls: await this.fileService.presignImageUrls(plan.imageUrls ?? []),
    };
  }

  async update(planId: string, dto: UpdatePlanDto): Promise<Plan> {
    await this.findOne(planId);
    const { planType, imageUrls, ...rest } = dto;
    const updates: Partial<Omit<Plan, 'planId' | 'createdAt'>> = {
      ...rest,
      ...(planType ? { planType: planType as PlanType } : {}),
      ...(imageUrls
        ? { imageUrls: imageUrls.map((u) => this.fileService.extractS3Key(u)) }
        : {}),
      updatedAt: new Date().toISOString(),
    };
    const updated = await this.repo.update(planId, updates);
    return {
      ...updated,
      imageUrls: await this.fileService.presignImageUrls(
        updated.imageUrls ?? [],
      ),
    };
  }

  async remove(planId: string): Promise<void> {
    await this.findOne(planId);
    await this.repo.delete(planId);
  }

  async setPromotion(planId: string, dto: SetPromotionDto): Promise<Plan> {
    await this.findOne(planId);
    const updated = await this.repo.setPromotion(planId, {
      type: dto.type,
      label: dto.label,
      expiresAt: dto.expiresAt,
      active: dto.active,
    });
    return {
      ...updated,
      imageUrls: await this.fileService.presignImageUrls(
        updated.imageUrls ?? [],
      ),
    };
  }

  async clearPromotion(planId: string): Promise<Plan> {
    await this.findOne(planId);
    const updated = await this.repo.clearPromotion(planId);
    return {
      ...updated,
      imageUrls: await this.fileService.presignImageUrls(
        updated.imageUrls ?? [],
      ),
    };
  }

  async uploadImage(
    base64: string,
    extension: string,
  ): Promise<{ key: string; publicUrl: string }> {
    return this.fileService.saveBase64(base64, extension, 'plans');
  }

  private async addPresignedUrls(plans: Plan[]): Promise<Plan[]> {
    return Promise.all(
      plans.map(async (p) => ({
        ...p,
        imageUrls: await this.fileService.presignImageUrls(p.imageUrls ?? []),
      })),
    );
  }
}
