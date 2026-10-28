import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/**
 * Validates req.body against a DTO schema and replaces it with the parsed
 * (trimmed, coerced) value. A ZodError is thrown -> central error handler -> 400.
 */
export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
