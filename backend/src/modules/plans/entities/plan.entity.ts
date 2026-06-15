export interface Plan {
  planId: string;
  title: string;
  priceUsd: number;
  description: string;
  imageUrl: string;
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
