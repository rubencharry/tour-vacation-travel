export type UserRole = 'admin' | 'gerente' | 'asesor';

export interface AuthenticatedUser {
  email: string;
  role?: UserRole;
  sub?: string;
}
