import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import serverless from 'serverless-http';

// Cache the initialized server between cold starts
let cachedServer: any = null;

async function bootstrapServer() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Apply global API prefix except for root path
  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.ALL }],
  });

  // Enable CORS for your frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') || '*',
    credentials: true,
  });

  // Disable detailed error stack traces in production
  app.enableShutdownHooks();

  await app.init();

  // Get Express instance for serverless wrapper
  const expressApp = app.getHttpAdapter().getInstance();

  console.log('✅ NestJS server bootstrapped successfully');
  return serverless(expressApp);
}

// Vercel entry point
export default async function handler(req, res) {
  try {
    if (!cachedServer) {
      cachedServer = await bootstrapServer();
    }
    return cachedServer(req, res);
  } catch (err) {
    console.error('❌ Serverless handler error:', err);
    res
      .status(500)
      .json({ message: 'Internal Server Error', error: err.message });
  }
}
