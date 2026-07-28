import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'tvt_admin_token';
const DEV_TOKEN_PREFIX = 'dev.';

export type UserRole = 'admin' | 'gerente' | 'asesor';

const DEV_USERS: Record<
  string,
  { name: string; password: string; role: UserRole }
> = {
  'admin@tourvacation.com': {
    name: 'Super Admin',
    password: 'Admin123!',
    role: 'admin',
  },
};

export interface PendingNewPasswordChallenge {
  cognitoUser: CognitoUser;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  readonly isAuthenticated = signal(this.hasValidToken());
  readonly pendingNewPasswordChallenge =
    signal<PendingNewPasswordChallenge | null>(null);

  readonly currentUser = computed(() => {
    const token = this.getToken();
    if (!token) return { name: 'Admin', email: '', role: undefined as UserRole | undefined };
    try {
      const raw = token.startsWith(DEV_TOKEN_PREFIX)
        ? token.slice(DEV_TOKEN_PREFIX.length)
        : token.split('.')[1];
      const payload = JSON.parse(atob(raw));
      const groups = (payload['cognito:groups'] ?? []) as string[];
      return {
        name: (payload['name'] ?? payload['cognito:username'] ?? payload['email']?.split('@')[0] ?? 'Admin') as string,
        email: (payload['email'] ?? '') as string,
        role: (payload['role'] ?? groups[0]) as UserRole | undefined,
      };
    } catch {
      return { name: 'Admin', email: '', role: undefined as UserRole | undefined };
    }
  });

  private get userPool(): CognitoUserPool | null {
    const { userPoolId, clientId } = environment.cognito;
    if (!userPoolId || !clientId) return null;
    return new CognitoUserPool({ UserPoolId: userPoolId, ClientId: clientId });
  }

  signIn(email: string, password: string): Promise<void> {
    if (!this.userPool) {
      const user = DEV_USERS[email.toLowerCase()];
      if (!user || user.password !== password) {
        return Promise.reject(new Error('Credenciales inválidas.'));
      }
      const payload = btoa(
        JSON.stringify({ email, name: user.name, role: user.role }),
      );
      localStorage.setItem(TOKEN_KEY, `${DEV_TOKEN_PREFIX}${payload}`);
      this.isAuthenticated.set(true);
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: this.userPool! });
      const authDetails = new AuthenticationDetails({ Username: email, Password: password });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session: CognitoUserSession) => {
          localStorage.setItem(TOKEN_KEY, session.getIdToken().getJwtToken());
          this.isAuthenticated.set(true);
          resolve();
        },
        onFailure: (err: Error) => {
          reject(new Error(err.message ?? 'Error de autenticación'));
        },
        newPasswordRequired: () => {
          this.pendingNewPasswordChallenge.set({ cognitoUser, email });
          resolve();
        },
      });
    });
  }

  completeNewPassword(newPassword: string): Promise<void> {
    const challenge = this.pendingNewPasswordChallenge();
    if (!challenge) {
      return Promise.reject(new Error('No hay un cambio de contraseña pendiente.'));
    }

    return new Promise((resolve, reject) => {
      challenge.cognitoUser.completeNewPasswordChallenge(
        newPassword,
        {},
        {
          onSuccess: (session: CognitoUserSession) => {
            localStorage.setItem(TOKEN_KEY, session.getIdToken().getJwtToken());
            this.isAuthenticated.set(true);
            this.pendingNewPasswordChallenge.set(null);
            resolve();
          },
          onFailure: (err: Error) => {
            reject(new Error(err.message ?? 'No se pudo cambiar la contraseña'));
          },
        },
      );
    });
  }

  cancelNewPasswordChallenge(): void {
    this.pendingNewPasswordChallenge.set(null);
  }

  signOut(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.isAuthenticated.set(false);
    this.router.navigate(['/admin/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    if (token.startsWith(DEV_TOKEN_PREFIX)) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
