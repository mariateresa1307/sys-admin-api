import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express'; // ✅ 1. Importar express


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  app.getHttpAdapter().getInstance().set('trust proxy', true);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: true,
    }),
  );

  app.enableCors({
    origin: 'http://localhost:3000', 
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 4000); 
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();