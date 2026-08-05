import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';

export { UrlNotFoundException } from '../../url/exceptions/url.exception';

/**
 * 404, deliberately the same status and message as UrlNotFoundException —
 * an anonymous visitor should not be able to distinguish "never existed"
 * from "exists but disabled". A distinct class purely so the two cases
 * stay independently traceable in logs, not because callers should
 * branch on which one they caught.
 */
export class UrlDisabledException extends AppException {
  constructor() {
    super('URL not found', HttpStatus.NOT_FOUND, 'URL_NOT_FOUND');
  }
}

/**
 * 410 Gone, not 404: unlike disabled/nonexistent, "this link has expired"
 * is legitimate, non-sensitive information to surface to a visitor.
 */
export class UrlExpiredException extends AppException {
  constructor() {
    super('This link has expired', HttpStatus.GONE, 'URL_EXPIRED');
  }
}
