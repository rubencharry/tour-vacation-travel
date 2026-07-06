import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CognitoGuard } from './cognito.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: CognitoGuard,
    },
  ],
})
export class AuthModule {}
