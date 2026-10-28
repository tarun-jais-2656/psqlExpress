import type { RequestHandler } from 'express';
import { notFound } from '../errors/AppError';

/** Runs after all routes: nothing matched, so forward a 404 to the error handler. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(notFound(`Route ${req.method} ${req.originalUrl} not found`));
};
