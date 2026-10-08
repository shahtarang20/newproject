import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.LOG_LEVEL ?? (env.isProd ? 'info' : env.isTest ? 'silent' : 'debug'),
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]', 'password', '*.password', 'passwordHash'],
    censor: '[redacted]',
  },
  ...(env.isDev
    ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
    : {}),
});

export type Logger = typeof logger;
