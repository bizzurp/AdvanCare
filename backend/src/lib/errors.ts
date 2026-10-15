import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** An error that is safe to show to the caller. Anything else becomes a generic 500. */
export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ErrorBody {
  error: { code: string; message: string; requestId: string; details?: unknown };
}
