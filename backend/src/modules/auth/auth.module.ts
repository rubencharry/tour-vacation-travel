import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CognitoGuard } from './cognito.guard';
import { RolesGuard } from './roles.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: CognitoGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AuthModule {}
