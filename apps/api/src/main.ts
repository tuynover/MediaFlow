import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export function validateEnvironmentConfig() {
  const isDemo = process.env.MEDIAFLOW_DEMO_MODE === 'true';
  const isProd = process.env.NODE_ENV === 'production';
  if (isDemo && isProd) {
    console.error('FATAL: MEDIAFLOW_DEMO_MODE=true is strictly prohibited in NODE_ENV=production!');
    throw new Error('FATAL: MEDIAFLOW_DEMO_MODE=true is strictly prohibited in NODE_ENV=production!');
  }
}

async function bootstrap() {
  validateEnvironmentConfig();
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 NestJS MediaFlow API server running on http://localhost:${port}`);
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
