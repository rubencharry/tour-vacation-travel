import { UserRole } from '../../auth/authenticated-user';

export const USER_STATUSES = ['active', 'inactive'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface User {
  userId: string;
  email: string;
  name: string;
  phone?: string;
  area?: string;
  notes?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}
