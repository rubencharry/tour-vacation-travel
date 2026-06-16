import { Injectable, NotFoundException } from '@nestjs/common';
import { PlansRepository } from './plans.repository';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Plan } from './entities/plan.entity';

@Injectable()
export class PlansService {
  constructor(private readonly repo: PlansRepository) {}

  async create(dto: CreatePlanDto): Promise<Plan> {
    const now = new Date().toISOString();
    const plan: Plan = {
      planId: crypto.randomUUID(),
      ...dto,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.put(plan);
    return plan;
  }

  async findActive(): Promise<Plan[]> {
    const all = await this.repo.findAll();
    return all
      .filter((p) => p.active)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async findOne(planId: string): Promise<Plan> {
    const plan = await this.repo.findById(planId);
    if (!plan) throw new NotFoundException(`Plan ${planId} no encontrado`);
    return plan;
  }

  async update(planId: string, dto: UpdatePlanDto): Promise<Plan> {
    await this.findOne(planId);
    return this.repo.update(planId, {
      ...dto,
      updatedAt: new Date().toISOString(),
    });
  }

  async remove(planId: string): Promise<void> {
    await this.findOne(planId);
    await this.repo.delete(planId);
  }
}
