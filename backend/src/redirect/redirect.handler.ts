import { HttpStatus } from '@nestjs/common';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { RedirectService } from './redirect.service';
import { resolveException } from '../common/exceptions/resolve-exception.util';

/**
 * Paths that must never be treated as short codes, even though they
 * structurally match the same single-segment shape this handler is
 * registered for. Must stay in sync with the `exclude` list passed to
 * `app.setGlobalPrefix()` in main.ts — both describe the same set of
 * "routes that live outside /api" paths, from two different mechanisms.
 */
const RESERVED_PATHS = new Set(['health']);

export function createRedirectHandler(getRedirectService: () => RedirectService): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const shortCode = Array.isArray(req.params.shortCode)
      ? req.params.shortCode[0]
      : req.params.shortCode;

    if (RESERVED_PATHS.has(shortCode)) {
      next();
      return;
    }

    void handle(req, res, shortCode, getRedirectService());
  };
}

async function handle(
  req: Request,
  res: Response,
  shortCode: string,
  redirectService: RedirectService,
): Promise<void> {
  try {
    const url = await redirectService.resolve(shortCode);

    // Deliberately not awaited: the redirect response must not wait on a
    // database write. Errors are caught and logged inside recordClick
    // itself, so this can never surface as an unhandled rejection.
    void redirectService.recordClick(url, req);

    res.redirect(HttpStatus.FOUND, url.originalUrl);
  } catch (error) {
    // This route bypasses Nest's request pipeline entirely (see the
    // module-level comment in main.ts), so it doesn't get
    // AllExceptionsFilter for free — resolveException is the same logic
    // that filter uses, shared rather than duplicated, so error responses
    // are identically shaped regardless of which path produced them.
    const { statusCode, message, error: errorName } = resolveException(error);
    res.status(statusCode).json({
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      message,
      error: errorName,
    });
  }
}
