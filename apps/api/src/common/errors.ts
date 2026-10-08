import type { ErrorCode } from '@vastra/shared';

export class AppError extends Error {
  status: number;
  code: ErrorCode | string;
  details?: unknown;
  /** Operational errors are expected and safe to show to clients. */
  isOperational = true;

  constructor(status: number, code: ErrorCode | string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const Errors = {
  badRequest: (code: ErrorCode | string, msg: string, details?: unknown): AppError => new AppError(400, code, msg, details),
  unauthorized: (msg = 'Authentication required', code: ErrorCode | string = 'AUTH_REQUIRED'): AppError => new AppError(401, code, msg),
  forbidden: (msg = 'You do not have permission to perform this action', code: ErrorCode | string = 'FORBIDDEN'): AppError =>
    new AppError(403, code, msg),
  notFound: (code: ErrorCode | string, msg: string): AppError => new AppError(404, code, msg),
  conflict: (code: ErrorCode | string, msg: string): AppError => new AppError(409, code, msg),
  tooMany: (msg = 'Too many requests, please try again later'): AppError => new AppError(429, 'RATE_LIMITED', msg),
  internal: (msg = 'Something went wrong'): AppError => new AppError(500, 'INTERNAL_ERROR', msg),
};

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;
