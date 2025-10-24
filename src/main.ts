import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import serverless from 'serverless-http';
import express from 'express';

// cache Nest/Express instance between warm invocations
let cachedServer: any = null;

async function bootstrapServer() {
  // Create Nest app using Express adapter
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Prefix every route with /api except root
  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.ALL }],
  });

  // Enable CORS for your deployed frontend(s)
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

  // Useful when Vercel freezes/unfreezes Lambdas
  app.enableShutdownHooks();

  // Initialize Nest (doesn't start a listening server)
  await app.init();

  // Get underlying Express instance
  const expressApp = app.getHttpAdapter().getInstance();

  // Return a serverless wrapper
  console.log('✅ NestJS server bootstrapped successfully');
  return serverless(expressApp, {
    requestId: 'x-vercel-request-id',
  });
}

// Lambda/Vercel entry point
export default async function handler(
  req: express.Request,
  res: express.Response,
) {
  try {
    if (!cachedServer) {
      cachedServer = await bootstrapServer();
    }
    return cachedServer(req, res);
  } catch (err) {
    console.error('❌ Serverless handler error:', err);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: (err as Error).message,
    });
  }
}
