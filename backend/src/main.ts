import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import serverlessExpress from '@vendia/serverless-express';
import type { Handler } from 'aws-lambda';
import { AppModule } from './app.module';

let cachedHandler: Handler;

async function bootstrapServer() {
  const expressApp = express();
  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  nestApp.setGlobalPrefix('api');
  nestApp.enableCors();
  await nestApp.init();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (event, context, callback) => {
  cachedHandler ??= await bootstrapServer();
  return cachedHandler(event, context, callback);
};

if (require.main === module) {
  void (async () => {
    const expressApp = express();
    const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    nestApp.setGlobalPrefix('api');
    nestApp.enableCors();
    await nestApp.listen(process.env.PORT ?? 3000);
  })();
}
