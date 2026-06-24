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
  inclusions: string[];
  terms: string;
  imageUrls: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
