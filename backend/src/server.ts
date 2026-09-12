import app from './app';
import { config } from './config';
import prisma from './config/database';
import { Server } from 'http';
import { logger } from './utils/logger';

let server: Server | undefined;
let shuttingDown = false;

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('shutdown_started', { signal });

  const forceTimer = setTimeout(() => {
    logger.error('shutdown_forced', new Error('Graceful shutdown timed out'), { signal });
    server?.closeAllConnections?.();
    process.exit(1);
  }, config.http.shutdownTimeoutMs);
  forceTimer.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close(error => error ? reject(error) : resolve());
        server!.closeIdleConnections?.();
      });
    }
    await prisma.$disconnect();
    clearTimeout(forceTimer);
    logger.info('shutdown_completed', { signal });
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(forceTimer);
    logger.error('shutdown_failed', error, { signal });
    process.exit(1);
  }
}

async function main(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('database_connected');

    server = app.listen(config.port, () => {
      logger.info('server_started', {
        port: config.port,
        environment: config.env,
        version: config.releaseVersion,
      });
    });
  } catch (error) {
    logger.error('server_start_failed', error);
    process.exit(1);
  }
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.on('uncaughtException', error => {
  logger.error('uncaught_exception', error);
  void shutdown('uncaughtException', 1);
});
process.on('unhandledRejection', error => {
  logger.error('unhandled_rejection', error);
  void shutdown('unhandledRejection', 1);
});

void main();
