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
