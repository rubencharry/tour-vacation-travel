import { Module } from '@nestjs/common';
import { CognitoAdminService } from './cognito-admin.service';

@Module({
  providers: [CognitoAdminService],
  exports: [CognitoAdminService],
})
export class CognitoAdminModule {}
