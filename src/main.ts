import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const origines = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const toutes = origines.includes('*') || origines.length === 0;
  // localhost / 127.0.0.1 sur n'importe quel port : back-office en local,
  // app Flutter lancée dans Chrome (flutter run -d chrome)…
  const local = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/;
  app.enableCors({
    origin: (
      origine: string | undefined,
      rappel: (err: Error | null, ok?: boolean) => void,
    ) => {
      // pas d'en-tête Origin = application mobile, Postman, serveur… → autorisé
      if (
        !origine ||
        toutes ||
        local.test(origine) ||
        origines.includes(origine)
      ) {
        return rappel(null, true);
      }
      rappel(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
      exceptionFactory: undefined,
    }),
  );
  app.enableShutdownHooks();

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 API Carnivore démarrée sur le port ${port}`, 'Bootstrap');
}
void bootstrap();
