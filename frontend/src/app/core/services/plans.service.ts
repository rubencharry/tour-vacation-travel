import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type PlanType = 'internacional' | 'nacional';

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
}
