import http from 'http';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { connectDatabase, disconnectDatabase } from '@/database/connection';
import { ensureDefaultPlan } from '@/modules/subscriptions/plan.bootstrap';
import { createApp } from '@/app';

async function main(): Promise<void> {
  await connectDatabase();
  await ensureDefaultPlan().catch((err) => logger.warn({ err }, 'could not ensure default plans'));

  const app = createApp();
  const server = http.createServer(app);
  server.listen(env.PORT, () => logger.info(`Vastra API listening on :${env.PORT} (${env.NODE_ENV})`));

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down…');
    const force = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
    force.unref();
    server.close(() => {
      disconnectDatabase()
        .catch((err) => logger.error({ err }, 'error closing database'))
        .finally(() => process.exit(0));
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => logger.error({ err: reason }, 'unhandledRejection'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException');
    shutdown('uncaughtException');
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
