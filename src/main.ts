import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import express from 'express';

let cachedServer: express.Express;

async function bootstrapServer() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.ALL }],
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cookie',
    ],
    credentials: true,
  });

  app.enableShutdownHooks();
  await app.init();

  console.log('✅ NestJS server bootstrapped successfully');

  return app.getHttpAdapter().getInstance();
}

export default async function handler(
  req: express.Request,
  res: express.Response,
) {
  try {
    const path = req.url?.split('?')[0] ?? '/';

    if (!path.startsWith('/api')) {
      if (path === '/' || path === '') {
        res
          .status(200)
          .json({ ok: true, message: 'Slotchain backend running ✅' });
        return;
      }

      res.status(404).json({ message: 'Not Found' });
      return;
    }

    if (!cachedServer) {
      cachedServer = await bootstrapServer();
    }

    return cachedServer(req, res);
  } catch (err) {
    console.error('❌ Server handler error:', err);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: (err as Error).message,
    });
  }
}
