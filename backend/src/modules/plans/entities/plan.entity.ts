export interface Plan {
  planId: string;
  title: string;
  priceUsd: number;
  description: string;
  imageUrls: string[];
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
