import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS & Cookie Parser
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.use(cookieParser());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 NestJS MediaFlow API server running on http://localhost:${port}`);
}

bootstrap();
