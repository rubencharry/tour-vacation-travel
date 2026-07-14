import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Lead {
  leadId: string;
  email: string;
  name: string;
  phone?: string;
  interestedPlanId: string;
  source?: string;
  message?: string;
  createdAt: string;
  emailSent: boolean;
}

export interface CreateLeadPayload {
  email: string;
  name: string;
  phone?: string;
  interestedPlanId: string;
  source?: string;
  message?: string;
}

export type UpdateLeadPayload = Partial<CreateLeadPayload>;

@Injectable({ providedIn: 'root' })
export class LeadsService {
  private http = inject(HttpClient);

  getLeads(): Observable<Lead[]> {
    return this.http.get<Lead[]>('/api/leads');
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
}
