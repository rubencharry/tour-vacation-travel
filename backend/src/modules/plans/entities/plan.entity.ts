export type PlanType = 'internacional' | 'nacional';

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
  createdAt: string;
  updatedAt: string;
}
