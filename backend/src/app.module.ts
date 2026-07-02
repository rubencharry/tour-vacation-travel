import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';
import { DynamoDbModule } from './modules/dynamodb/dynamodb.module';
import { PlansModule } from './modules/plans/plans.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { MailModule } from './modules/mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
import { ServicesModule } from './modules/services/services.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DynamoDbModule,
    HealthModule,
    PlansModule,
    LeadsModule,
    ProvidersModule,
    MailModule,
    AuthModule,
    ServicesModule,
  ],
})
export class AppModule {}
