import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { randomInt, randomUUID } from 'crypto';
import { UserRole } from '../auth/authenticated-user';

export interface CreateCognitoUserResult {
  sub: string;
  temporaryPassword: string;
}

@Injectable()
export class CognitoAdminService {
  private readonly logger = new Logger(CognitoAdminService.name);
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly isConfigured: boolean;

  constructor(config: ConfigService) {
    this.userPoolId = config.get<string>('COGNITO_USER_POOL_ID', '');
    this.isConfigured = Boolean(this.userPoolId);
    this.client = new CognitoIdentityProviderClient({
      region: config.get('AWS_REGION', 'sa-east-1'),
    });
    if (!this.isConfigured) {
      this.logger.warn(
        'COGNITO_USER_POOL_ID no configurado — operaciones de Cognito en modo dev (no-op)',
      );
    }
  }

  async createUser(
    email: string,
    role: UserRole,
  ): Promise<CreateCognitoUserResult> {
    const temporaryPassword = this.generateTemporaryPassword();

    if (!this.isConfigured) {
      this.logger.log(`[DEV] Se crearía ${email} en Cognito (rol ${role})`);
      return { sub: randomUUID(), temporaryPassword };
    }

    const result = await this.client.send(
      new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
        ],
        TemporaryPassword: temporaryPassword,
        MessageAction: 'SUPPRESS',
      }),
    );

    const sub = result.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;
    if (!sub) {
      throw new Error('Cognito no devolvió el sub del usuario creado');
    }

    await this.client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        GroupName: role,
      }),
    );

    return { sub, temporaryPassword };
  }

  async resetPassword(email: string): Promise<string> {
    const temporaryPassword = this.generateTemporaryPassword();

    if (!this.isConfigured) {
      this.logger.log(`[DEV] Se resetearía la clave de ${email} en Cognito`);
      return temporaryPassword;
    }

    await this.client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        Password: temporaryPassword,
        Permanent: false,
      }),
    );

    return temporaryPassword;
  }

  async setEnabled(email: string, enabled: boolean): Promise<void> {
    if (!this.isConfigured) {
      this.logger.log(
        `[DEV] Se ${enabled ? 'activaría' : 'desactivaría'} a ${email} en Cognito`,
      );
      return;
    }

    const command = enabled
      ? new AdminEnableUserCommand({
          UserPoolId: this.userPoolId,
          Username: email,
        })
      : new AdminDisableUserCommand({
          UserPoolId: this.userPoolId,
          Username: email,
        });

    await this.client.send(command);
  }

  private generateTemporaryPassword(): string {
    // Evita caracteres ambiguos (I, O, l, 0, 1) para que sea fácil de tipear a mano.
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const all = upper + lower + digits;
    const pick = (chars: string) => chars[randomInt(chars.length)];

    const chars = [pick(upper), pick(lower), pick(digits)];
    for (let i = 0; i < 9; i++) chars.push(pick(all));

    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  }
}
