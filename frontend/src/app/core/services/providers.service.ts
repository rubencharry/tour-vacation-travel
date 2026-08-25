import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type OperatorType = 'mayorista' | 'operador';
export type ProviderStatus = 'activo' | 'inactivo';

export interface Provider {
  providerId: string;
  registrationDate: string;
  operatorType: OperatorType;
  businessName: string;
  nit: string;
  mainContact: string;
  contactRole: string;
  phone: string;
  whatsapp?: string;
  email: string;
  city?: string;
  country?: string;
  website?: string;
  paymentMethod?: string;
  commissionPct?: number;
  username?: string;
  password?: string;
  status: ProviderStatus;
  notes?: string;
  services: string[];
}

export interface CreateProviderPayload {
  operatorType: OperatorType;
  businessName: string;
  nit: string;
  mainContact: string;
  contactRole: string;
  phone: string;
  whatsapp?: string;
  email: string;
  city?: string;
  country?: string;
  website?: string;
  paymentMethod?: string;
  commissionPct?: number;
  username?: string;
  password?: string;
  status: ProviderStatus;
  notes?: string;
  services: string[];
}

export type UpdateProviderPayload = Partial<CreateProviderPayload>;

@Injectable({ providedIn: 'root' })
export class ProvidersService {
  private readonly http = inject(HttpClient);

  getProviders(): Observable<Provider[]> {
    return this.http.get<Provider[]>('/api/providers');
  }

  createProvider(dto: CreateProviderPayload): Observable<Provider> {
    return this.http.post<Provider>('/api/providers', dto);
  }

  updateProvider(id: string, dto: UpdateProviderPayload): Observable<Provider> {
    return this.http.patch<Provider>(`/api/providers/${id}`, dto);
  }

  deleteProvider(id: string): Observable<void> {
    return this.http.delete<void>(`/api/providers/${id}`);
  }
}
