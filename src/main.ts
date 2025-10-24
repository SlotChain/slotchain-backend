import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import serverless from 'serverless-http';

let server: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.ALL }],
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  return serverless(expressApp);
}

export default async function handler(req, res) {
  server = server ?? (await bootstrap());
  return server(req, res);
}
