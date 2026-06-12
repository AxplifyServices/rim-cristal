import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const config = app.get(ConfigService);
  const frontendUrl = config.get<string>('FRONTEND_URL') || 'http://localhost:3001';
  const adminFrontendUrl = config.get<string>('ADMIN_FRONTEND_URL');

  const allowedOrigins = [
    frontendUrl,
    adminFrontendUrl,
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: true,
    }),
  );

  const port = Number(config.get('PORT') || 3000);

  await app.listen(port);

  console.log(`Lux Lumina API running on http://localhost:${port}/api`);
}

bootstrap();