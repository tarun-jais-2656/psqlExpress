/**
 * Errors we throw on purpose. Anything that is NOT an AppError reaching the
 * error handler is treated as an unexpected bug (HTTP 500).
 */
export interface AppError extends Error {
  isAppError: true;
  statusCode: number;
  details?: unknown;
}

export const createError = (statusCode: number, message: string, details?: unknown): AppError =>
  Object.assign(new Error(message), { isAppError: true as const, statusCode, details });

export const isAppError = (err: unknown): err is AppError =>
  err instanceof Error && (err as Partial<AppError>).isAppError === true;

export const badRequest = (message = 'Bad request', details?: unknown) => createError(400, message, details);
export const notFound = (message = 'Resource not found') => createError(404, message);
export const conflict = (message = 'Resource already exists') => createError(409, message);
