import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api'); // All routes prefixed with /api
  app.enableCors({
    origin: 'http://localhost:5173', // frontend origin (Vite default)
    credentials: true,
  });

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`✅ Backend running on http://localhost:${port}`);
}

bootstrap();
