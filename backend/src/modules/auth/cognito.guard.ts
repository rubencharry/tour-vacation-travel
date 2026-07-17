import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class CognitoGuard implements CanActivate {
  private verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    const userPoolId = this.config.get<string>('COGNITO_USER_POOL_ID');
    const clientId = this.config.get<string>('COGNITO_CLIENT_ID');

    if (userPoolId && clientId) {
      this.verifier = CognitoJwtVerifier.create({
        userPoolId,
        tokenUse: 'id',
        clientId,
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { email: string } }>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Bypass local de desarrollo: igual setea request.user para poder probar
    // la atribución de actividades (@CurrentUser()) sin Cognito real.
    if (this.config.get<string>('BYPASS_AUTH') === 'true') {
      request.user = { email: 'dev-local@tourvacation.com' };
      return true;
    }

    const token = this.extractToken(request);
    if (token && this.verifier) {
      try {
        const payload = await this.verifier.verify(token);
        request.user = {
          email:
            (payload.email as string) ??
            (payload['cognito:username'] as string),
        };
      } catch {
        if (!isPublic)
          throw new UnauthorizedException('Token inválido o expirado');
      }
    }

    if (isPublic) return true;

    if (!this.verifier) {
      throw new UnauthorizedException('Auth no configurado');
    }
    if (!request.user) throw new UnauthorizedException('Token requerido');
    return true;
  }

  private extractToken(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
