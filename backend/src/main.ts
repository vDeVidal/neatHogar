import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import * as fs from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const uploadsRoot = join(process.cwd(), 'uploads');
  const evidenciasDir = join(uploadsRoot, 'evidencias');
  fs.mkdirSync(evidenciasDir, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));

  // Servir evidencias fotográficas tanto en /uploads/... como en /api/uploads/...
  app.useStaticAssets(uploadsRoot, { prefix: '/uploads/' });
  app.useStaticAssets(uploadsRoot, { prefix: '/api/uploads/' });

  app.setGlobalPrefix('api');
  app.enableCors({ origin: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`🏠 NeatHogar API v2 escuchando en http://localhost:${port}/api`);
}
bootstrap();
