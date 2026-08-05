import { HttpException, HttpStatus } from '@nestjs/common';

export interface ResolvedException {
  statusCode: number;
  message: string | string[];
  error: string;
}

export function resolveException(exception: unknown): ResolvedException {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();
    const isObject = typeof response === 'object' && response !== null;

    return {
      statusCode: exception.getStatus(),
      message: isObject
        ? ((response as Record<string, unknown>).message as string | string[])
        : response,
      error: isObject ? ((response as Record<string, unknown>).error as string) : exception.name,
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
    error: 'InternalServerError',
  };
}
