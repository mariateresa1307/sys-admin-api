import { NestFactory } from '@nestjs/core';
import { SeedsModule } from './seeds/seeds.module';
import { SeedService } from './seeds/seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedsModule);
  const seedService = app.get(SeedService);

  try {
    await seedService.run();
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
