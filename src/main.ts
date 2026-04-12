import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CONFIGURACIÓN DE CORS
  app.enableCors({
    origin: 'http://localhost:3000', // El puerto de tu Next.js
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 4000); // Puerto fijo 4000
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();