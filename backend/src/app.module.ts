import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';
import { DynamoDbModule } from './modules/dynamodb/dynamodb.module';
import { PlansModule } from './modules/plans/plans.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DynamoDbModule,
    HealthModule,
    PlansModule,
    LeadsModule,
    ProvidersModule,
    MailModule,
  ],
})
export class AppModule {}
