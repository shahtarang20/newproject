import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { Errors } from '../errors';

export interface ValidateSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/** Validates & replaces req.body/query/params with the parsed (coerced, stripped) values. */
export const validate =
  (schemas: ValidateSchemas): RequestHandler =>
  (req, _res, next) => {
    const issues: Array<{ part: string; path: string; message: string }> = [];
    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part]);
      if (result.success) {
        (req as unknown as Record<string, unknown>)[part] = result.data;
      } else {
        for (const i of result.error.issues) issues.push({ part, path: i.path.join('.'), message: i.message });
      }
    }
    if (issues.length) return next(Errors.badRequest('VALIDATION_ERROR', 'Validation failed', { issues }));
    return next();
  };
