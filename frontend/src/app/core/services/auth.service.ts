import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'tvt_admin_token';
const DEV_TOKEN = 'dev-bypass-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  readonly isAuthenticated = signal(this.hasValidToken());

  private get userPool(): CognitoUserPool | null {
    const { userPoolId, clientId } = environment.cognito;
    if (!userPoolId || !clientId) return null;
    return new CognitoUserPool({ UserPoolId: userPoolId, ClientId: clientId });
  }

  signIn(email: string, password: string): Promise<void> {
    // Dev bypass cuando Cognito no está configurado
    if (!this.userPool) {
      localStorage.setItem(TOKEN_KEY, DEV_TOKEN);
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
          reject(new Error('Se requiere cambio de contraseña. Contactá al administrador.'));
        },
      });
    });
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
    if (token === DEV_TOKEN) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
