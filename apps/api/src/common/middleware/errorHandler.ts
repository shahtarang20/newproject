import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MongoServerError } from 'mongodb';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { JsonWebTokenError, NotBeforeError, TokenExpiredError } from 'jsonwebtoken';
import multer from 'multer';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { AppError } from '../errors';

interface Normalised {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

function normalise(err: unknown): Normalised {
  if (err instanceof AppError) return { status: err.status, code: err.code, message: err.message, details: err.details };

  if (err instanceof ZodError) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: { issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) },
    };
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: { issues: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })) },
    };
  }
  if (err instanceof mongoose.Error.CastError) {
    return { status: 400, code: 'VALIDATION_ERROR', message: `Invalid value for ${err.path}` };
  }
  if (err instanceof MongoServerError && err.code === 11000) {
    const fields = Object.keys((err as { keyPattern?: Record<string, unknown> }).keyPattern ?? {}).filter((k) => k !== 'shopId');
    return {
      status: 409,
      code: 'CONFLICT',
      message: fields.length ? `A record with this ${fields.join(', ')} already exists` : 'Duplicate record',
      details: { fields },
    };
  }
  if (err instanceof TokenExpiredError) return { status: 401, code: 'TOKEN_EXPIRED', message: 'Access token expired' };
  if (err instanceof JsonWebTokenError || err instanceof NotBeforeError) {
    return { status: 401, code: 'AUTH_REQUIRED', message: 'Invalid authentication token' };
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return { status: 413, code: 'UPLOAD_TOO_LARGE', message: 'File is too large' };
    return { status: 400, code: 'VALIDATION_ERROR', message: `Upload error: ${err.message}` };
  }
  const e = err as { type?: string; status?: number };
  if (e?.type === 'entity.parse.failed') return { status: 400, code: 'VALIDATION_ERROR', message: 'Malformed JSON body' };
  if (e?.type === 'entity.too.large') return { status: 413, code: 'VALIDATION_ERROR', message: 'Request body too large' };

  return { status: 500, code: 'INTERNAL_ERROR', message: 'Something went wrong' };
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.path}` } });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const n = normalise(err);
  if (n.status >= 500) logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  else logger.debug({ code: n.code, path: req.path }, n.message);

  if (res.headersSent) return;
  res.status(n.status).json({
    success: false,
    error: {
      code: n.code,
      message: n.message,
      ...(n.details !== undefined ? { details: n.details } : {}),
      ...(!env.isProd && n.status >= 500 && err instanceof Error ? { stack: err.stack } : {}),
    },
  });
};
