import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { API_PREFIX, MAX_JSON_BODY, UPLOADS_DIR_NAME } from '@/config/constants';
import { errorHandler, notFoundHandler } from '@/common/middleware/errorHandler';
import { publicRateLimit } from '@/common/middleware/rateLimit';
import { LOCAL_UPLOAD_ROOT } from '@/providers/storage/local';
import apiRouter from '@/modules';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.FRONTEND_URL.split(',').map((o) => o.trim()), credentials: true }));
  app.use(compression());
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url?.endsWith('/health') ?? false } }));

  if (env.STORAGE_PROVIDER === 'local') {
    app.use(`/${UPLOADS_DIR_NAME}`, express.static(LOCAL_UPLOAD_ROOT, { maxAge: '7d', index: false, dotfiles: 'deny' }));
  }

  // Webhooks need the exact raw bytes for signature verification, so capture them BEFORE the JSON parser.
  // body-parser then skips the (already parsed) request, leaving req.body as parsed JSON and req.rawBody as Buffer.
  app.use(
    `${API_PREFIX}/webhooks`,
    express.raw({ type: () => true, limit: '1mb' }),
    (req, _res, next) => {
      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      req.rawBody = raw;
      try {
        req.body = raw.length ? JSON.parse(raw.toString('utf8')) : {};
      } catch {
        req.body = {};
      }
      next();
    },
  );

  app.use(express.json({ limit: MAX_JSON_BODY }));
  app.use(express.urlencoded({ extended: false, limit: MAX_JSON_BODY }));

  app.use(API_PREFIX, publicRateLimit, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
