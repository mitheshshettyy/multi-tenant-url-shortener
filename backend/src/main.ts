import 'reflect-metadata';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RedirectService } from './redirect/redirect.service';
import { createRedirectHandler } from './redirect/redirect.handler';
import type { Configuration } from './config/configuration';

async function bootstrap(): Promise<void> {
  // The public redirect route (GET /:shortCode) is registered on the raw Express
  // instance before Nest's router is attached. This avoids two issues:
  // 1. Nest's `setGlobalPrefix` exclude option matches by route shape rather than
  //    controller, so excluding `:shortCode` would incorrectly strip the global API
  //    prefix from other single-segment routes (e.g. GET /urls).
  // 2. Once Nest's router is attached, unmatched requests produce Nest's 404
  //    response without falling through to subsequently registered Express handlers.
  //
  // Reserved paths (e.g. /health) are explicitly bypassed in redirect.handler.ts
  // via RESERVED_PATHS to let reserved requests fall through to Nest's router.
  const expressApp = express();

  const serviceRef: { redirectService?: RedirectService } = {};
  expressApp.get(
    '/:shortCode',
    createRedirectHandler(() => {
      if (!serviceRef.redirectService) {
        throw new Error('Redirect route hit before application finished initializing');
      }
      return serviceRef.redirectService;
    }),
  );

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService<Configuration>);
  const appConfig = configService.getOrThrow('app', { infer: true });

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({
    origin: appConfig.corsOrigin,
    credentials: true,
  });
  app.setGlobalPrefix(appConfig.apiPrefix, { exclude: ['health'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  await app.init();
  serviceRef.redirectService = app.get(RedirectService);

  await app.listen(appConfig.port);
}

void bootstrap();
