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
