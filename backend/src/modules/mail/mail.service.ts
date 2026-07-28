import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface BulkMailResult {
  sent: number;
  failed: number;
  total: number;
}

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 800;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly ses: SESClient;
  private readonly fromAddress: string;
  private readonly isDev: boolean;

  constructor(config: ConfigService) {
    // MAIL_FORCE_SEND permite mandar por SES real en local (dev) para probar
    // flujos de email de punta a punta sin promover NODE_ENV a production.
    const forceSend = config.get<string>('MAIL_FORCE_SEND') === 'true';
    this.isDev = config.get('NODE_ENV') !== 'production' && !forceSend;
    this.fromAddress = config.get<string>('SES_FROM_ADDRESS', '');
    if (!this.isDev && !this.fromAddress) {
      this.logger.warn(
        'SES_FROM_ADDRESS no configurada — envío de mails deshabilitado',
      );
    }
    this.ses = new SESClient({ region: config.get('AWS_REGION', 'sa-east-1') });
  }

  async send(options: SendMailOptions): Promise<void> {
    if (this.isDev) {
      this.logger.log(`[DEV] To: ${options.to} | Subject: ${options.subject}`);
      return;
    }

    if (!this.fromAddress) {
      this.logger.warn(`Mail omitido (SES no configurada) — To: ${options.to}`);
      return;
    }

    await this.ses.send(
      new SendEmailCommand({
        Source: this.fromAddress,
        Destination: { ToAddresses: [options.to] },
        Message: {
          Subject: { Data: options.subject, Charset: 'UTF-8' },
          Body: { Html: { Data: options.html, Charset: 'UTF-8' } },
        },
      }),
    );
  }

  async sendBulk(
    recipients: string[],
    subject: string,
    html: string,
  ): Promise<BulkMailResult> {
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((to) => this.send({ to, subject, html })),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') sent++;
        else {
          failed++;
          this.logger.error(`Bulk send failure: ${String(result.reason)}`);
        }
      }

      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    this.logger.log(`Bulk done — sent: ${sent}, failed: ${failed}`);
    return { sent, failed, total: recipients.length };
  }
}
