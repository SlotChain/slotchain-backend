import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import express from 'express';

// Cache the server instance across Vercel invocations
let cachedServer: express.Express;

async function bootstrapServer() {
  const app = await NestFactory.create(AppModule);

  // ❌ Remove global prefix 'api' — Vercel already mounts /api/*
  // app.setGlobalPrefix('api');

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

  await app.init();
  console.log('✅ NestJS server bootstrapped successfully');
  return app.getHttpAdapter().getInstance();
}

// Vercel serverless entry point
export default async function handler(
  req: express.Request,
  res: express.Response,
) {
  try {
    // Boot cached NestJS instance only once
    if (!cachedServer) {
      cachedServer = await bootstrapServer();
    }

    return cachedServer(req, res);
  } catch (err) {
    console.error('❌ Handler error:', err);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: (err as Error).message,
    });
  }
}
