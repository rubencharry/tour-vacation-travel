export type PlanType = 'internacional' | 'nacional';

export type PromotionType =
  | 'dos_x_uno'
  | 'precio_especial'
  | 'cupos_limitados'
  | 'texto_libre';

export interface Promotion {
  type: PromotionType;
  label: string;
  expiresAt?: string;
  active: boolean;
}

export interface Plan {
  planId: string;
  title: string;
  price: number;
  currency: string;
  priceDetails: string;
  description: string;
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
