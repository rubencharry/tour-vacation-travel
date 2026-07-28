import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserRole } from './auth.service';

export type UserStatus = 'active' | 'inactive';

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

export interface CreateUserPayload {
  email: string;
  name: string;
  phone?: string;
  area?: string;
  notes?: string;
}

export interface UpdateUserPayload {
  name?: string;
  phone?: string;
  area?: string;
  notes?: string;
  status?: UserStatus;
}

export interface UpdateOwnProfilePayload {
  name?: string;
  phone?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }

  getUser(userId: string): Observable<User> {
    return this.http.get<User>(`/api/users/${userId}`);
  }

  getMe(): Observable<User> {
    return this.http.get<User>('/api/users/me');
  }

  updateMe(dto: UpdateOwnProfilePayload): Observable<User> {
    return this.http.patch<User>('/api/users/me', dto);
  }

  createUser(dto: CreateUserPayload): Observable<User> {
    return this.http.post<User>('/api/users', dto);
  }

  updateUser(userId: string, dto: UpdateUserPayload): Observable<User> {
    return this.http.patch<User>(`/api/users/${userId}`, dto);
  }

  resetPassword(userId: string): Observable<void> {
    return this.http.post<void>(`/api/users/${userId}/reset-password`, {});
  }

  activateUser(userId: string): Observable<User> {
    return this.http.post<User>(`/api/users/${userId}/activate`, {});
  }

  deactivateUser(userId: string): Observable<User> {
    return this.http.post<User>(`/api/users/${userId}/deactivate`, {});
  }
}
