import { vValidator } from '@hono/valibot-validator';
import type { ValidationTargets } from 'hono';
import * as v from 'valibot';
import { ApiError } from './errors';

/**
 * Valibot validator for every request payload. Failures throw an ApiError so the
 * error middleware returns the standard error envelope (422 VALIDATION_FAILED).
 */
export const validate = <T extends v.GenericSchema, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) =>
  vValidator(target, schema, (result) => {
    if (!result.success) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'The request is invalid.', v.flatten(result.issues));
    }
  });
