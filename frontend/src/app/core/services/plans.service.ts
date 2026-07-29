import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type PlanType = 'internacional' | 'nacional';

export type PromotionType = 'dos_x_uno' | 'precio_especial' | 'cupos_limitados' | 'texto_libre';

export interface Promotion {
  type: PromotionType;
  label: string;
  expiresAt?: string;
  active: boolean;
}

export interface Plan {
  planId: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  priceDetails: string;
  durationDays: number;
  durationNights: number;
  validity: string;
  departureCity: string;
  planType: PlanType;
  inclusions: string[];
  terms: string;
  imageUrls: string[];
  active: boolean;
  displayOrder: number;
  promotion?: Promotion;
  createdAt: string;
  updatedAt: string;
}

export interface PlansMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PlansResponse {
  data: Plan[];
  meta: PlansMeta;
}

export type CreatePlanPayload = Omit<Plan, 'planId' | 'createdAt' | 'updatedAt' | 'displayOrder'>;
export type UpdatePlanPayload = Partial<Omit<Plan, 'planId' | 'createdAt' | 'updatedAt'>>;

@Injectable({ providedIn: 'root' })
export class PlansService {
  private http = inject(HttpClient);

  getPlans(opts: { limit?: number; page?: number; active?: boolean; planType?: PlanType } = {}): Observable<PlansResponse> {
    let params = new HttpParams();
    if (opts.limit !== undefined) params = params.set('limit', opts.limit);
    if (opts.page !== undefined) params = params.set('page', opts.page);
    if (opts.active !== undefined) params = params.set('active', opts.active);
    if (opts.planType !== undefined) params = params.set('planType', opts.planType);
    return this.http.get<PlansResponse>('/api/plans', { params });
  }

  getPlan(id: string): Observable<Plan> {
    return this.http.get<Plan>(`/api/plans/${id}`);
  }

  createPlan(dto: CreatePlanPayload): Observable<Plan> {
    return this.http.post<Plan>('/api/plans', dto);
  }

  updatePlan(id: string, dto: UpdatePlanPayload): Observable<Plan> {
    return this.http.patch<Plan>(`/api/plans/${id}`, dto);
  }

  deletePlan(id: string): Observable<void> {
    return this.http.delete<void>(`/api/plans/${id}`);
  }

  setPromotion(id: string, dto: { type: PromotionType; label: string; expiresAt?: string; active: boolean }): Observable<Plan> {
    return this.http.put<Plan>(`/api/plans/${id}/promotion`, dto);
  }

  clearPromotion(id: string): Observable<Plan> {
    return this.http.delete<Plan>(`/api/plans/${id}/promotion`);
  }
}
