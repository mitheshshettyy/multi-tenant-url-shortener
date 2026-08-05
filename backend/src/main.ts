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
  // The public redirect route (GET /:shortCode) is deliberately not a Nest
  // @Controller, and is registered on this raw Express instance *before*
  // Nest's own router is attached to it below. Two things this avoids:
  //
  // 1. setGlobalPrefix's `exclude` option matches routes by shape, not by
  //    controller — a dynamic single-segment exclude pattern like
  //    ':shortCode' would also match any other single-segment route in
  //    the app (e.g. GET /urls), silently stripping its prefix too. This
  //    was caught by actually testing it, not by inspection: GET
  //    /api/v1/urls started returning 404 once that exclude entry was
  //    added, because Nest excluded /urls from the prefix as well.
  //
  // 2. Once Nest's own router is attached, it terminally handles any
  //    request nothing else has claimed (its own 404), and does not fall
  //    through to handlers registered afterward — so this route has to
  //    be registered first, not merely outside setGlobalPrefix.
  //
  // Registering first creates the mirror-image risk: a request for
  // /health would also match this route before Nest ever sees it. The
  // handler defends against that explicitly (see redirect.handler.ts's
  // RESERVED_PATHS) by calling next() for known reserved paths, letting
  // the request fall through to Nest's router, mounted right after.
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
