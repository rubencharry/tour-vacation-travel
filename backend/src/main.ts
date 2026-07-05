import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import serverlessExpress from '@vendia/serverless-express';
import type { Handler } from 'aws-lambda';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

let cachedHandler: Handler;

async function bootstrapServer() {
  const expressApp = express();
  expressApp.use(express.json({ limit: '10mb' }));
  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );
  nestApp.setGlobalPrefix('api');
  nestApp.enableCors();
  nestApp.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  await nestApp.init();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (event, context, callback) => {
  cachedHandler ??= await bootstrapServer();
  return cachedHandler(event, context, callback) as unknown;
};

if (require.main === module) {
  void (async () => {
    const expressApp = express();
    expressApp.use(express.json({ limit: '10mb' }));

    // Servir uploads locales cuando no hay S3 configurado
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
    expressApp.use('/uploads', express.static(uploadsDir));

    const nestApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );
    nestApp.setGlobalPrefix('api');
    nestApp.enableCors();
    nestApp.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await nestApp.listen(process.env.PORT ?? 3000);
  })();
}
