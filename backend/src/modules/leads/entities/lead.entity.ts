export const LEAD_STATUSES = [
  'nuevo',
  'contactado',
  'propuesta_enviada',
  'comprado',
  'rechazado',
  'no_responde',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  'manual',
  'whatsapp',
  'web',
  'instagram',
  'facebook',
  'referido',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export type LeadActivityType =
  | 'created'
  | 'status_changed'
  | 'contacted'
  | 'note';

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
  status: LeadStatus;
  activities: LeadActivity[];
}
