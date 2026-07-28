import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SelectOption } from '../../shared/components/app-select/app-select.component';

export type LeadStatus =
  | 'nuevo'
  | 'contactado'
  | 'propuesta_enviada'
  | 'comprado'
  | 'rechazado'
  | 'no_responde';

export type LeadSource = 'manual' | 'whatsapp' | 'web' | 'instagram' | 'facebook' | 'referido';

export type LeadActivityType = 'created' | 'status_changed' | 'contacted' | 'note';

export interface LeadActivity {
  id: string;
  type: LeadActivityType;
  createdAt: string;
  actorEmail?: string;
  note?: string;
  status?: LeadStatus;
  channel?: 'whatsapp' | 'email';
}

export interface Lead {
  leadId: string;
  email: string;
  name: string;
  phone?: string;
  interestedPlanId: string;
  source?: LeadSource;
  message?: string;
  createdAt: string;
  emailSent: boolean;
  status?: LeadStatus;
  activities?: LeadActivity[];
}

export interface CreateLeadPayload {
  email: string;
  name: string;
  phone?: string;
  interestedPlanId: string;
  source?: LeadSource;
  message?: string;
}

export type UpdateLeadPayload = Partial<CreateLeadPayload>;

export type CreateLeadActivityPayload =
  | { type: 'status_changed'; status: LeadStatus; note?: string }
  | { type: 'contacted'; channel: 'whatsapp' | 'email'; note?: string }
  | { type: 'note'; note: string };

export interface BulkMailResult {
  sent: number;
  failed: number;
  total: number;
}

// Espejo manual de backend/src/modules/leads/entities/lead.entity.ts — mantener sincronizado.
export const LEAD_STATUSES: (SelectOption & { value: LeadStatus })[] = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'propuesta_enviada', label: 'Propuesta enviada' },
  { value: 'comprado', label: 'Compró' },
  { value: 'rechazado', label: 'Rechazó' },
  { value: 'no_responde', label: 'No responde' },
];

export const LEAD_SOURCES: (SelectOption & { value: LeadSource })[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'web', label: 'Web' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'referido', label: 'Referido' },
];

export function leadStatusLabel(status?: LeadStatus): string {
  return LEAD_STATUSES.find((s) => s.value === status)?.label ?? 'Nuevo';
}

export function leadStatusColorClass(status?: LeadStatus): string {
  switch (status ?? 'nuevo') {
    case 'nuevo': return 'bg-primary-container/10 text-primary-container';
    case 'contactado': return 'bg-brand-teal/10 text-secondary';
    case 'propuesta_enviada': return 'bg-brand-terracotta/10 text-brand-terracotta';
    case 'comprado': return 'bg-brand-teal text-white';
    case 'rechazado': return 'bg-error-container text-on-error-container';
    case 'no_responde': return 'bg-surface-container text-on-surface-variant';
  }
}

export function leadSourceLabel(source?: LeadSource): string {
  return LEAD_SOURCES.find((s) => s.value === source)?.label ?? 'Sin especificar';
}

@Injectable({ providedIn: 'root' })
export class LeadsService {
  private http = inject(HttpClient);

  getLeads(): Observable<Lead[]> {
    return this.http.get<Lead[]>('/api/leads');
  }

  getLead(leadId: string): Observable<Lead> {
    return this.http.get<Lead>(`/api/leads/${leadId}`);
  }

  createLead(dto: CreateLeadPayload): Observable<Lead> {
    return this.http.post<Lead>('/api/leads', dto);
  }

  updateLead(leadId: string, dto: UpdateLeadPayload): Observable<Lead> {
    return this.http.patch<Lead>(`/api/leads/${leadId}`, dto);
  }

  deleteLead(leadId: string): Observable<void> {
    return this.http.delete<void>(`/api/leads/${leadId}`);
  }

  addActivity(leadId: string, dto: CreateLeadActivityPayload): Observable<Lead> {
    return this.http.post<Lead>(`/api/leads/${leadId}/activities`, dto);
  }

  sendCampaign(leadIds: string[], planId: string): Observable<BulkMailResult> {
    return this.http.post<BulkMailResult>('/api/leads/send-campaign', { leadIds, planId });
  }
}
