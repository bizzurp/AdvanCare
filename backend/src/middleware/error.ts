import type { ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../env';
import { ApiError, type ErrorBody } from '../lib/errors';

/** Single error envelope. Internal details are logged with the request ID, never returned. */
export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  const requestId = c.get('requestId') ?? 'unknown';
  if (err instanceof ApiError) {
    const body: ErrorBody = { error: { code: err.code, message: err.message, requestId } };
    if (err.details !== undefined) body.error.details = err.details;
    return c.json(body, err.status);
  }
  if (err instanceof HTTPException) {
    const status = err.status;
    const body: ErrorBody = {
      error: { code: status === 400 ? 'BAD_REQUEST' : 'HTTP_ERROR', message: err.message || 'Request failed.', requestId },
    };
    return c.json(body, status);
  }
  console.error(JSON.stringify({ requestId, level: 'error', message: err.message, stack: err.stack }));
  const body: ErrorBody = { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', requestId } };
  return c.json(body, 500);
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) => {
  const body: ErrorBody = {
    error: { code: 'NOT_FOUND', message: 'Route not found.', requestId: c.get('requestId') ?? 'unknown' },
  };
  return c.json(body, 404);
};
