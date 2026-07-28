import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { CognitoAdminModule } from '../cognito-admin/cognito-admin.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [CognitoAdminModule, MailModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
