import { Request, Response } from 'express';
import prisma from '../../config/database';
import { config } from '../../config';
import { logger } from '../../utils/logger';

const READINESS_TIMEOUT_MS = 2000;

async function checkDatabase(): Promise<void> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Database readiness check timed out')), READINESS_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function live(_req: Request, res: Response): void {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: config.releaseVersion,
    },
  });
}

export async function ready(_req: Request, res: Response): Promise<void> {
  try {
    await checkDatabase();
    res.json({
      success: true,
      data: { status: 'ready', timestamp: new Date().toISOString(), version: config.releaseVersion },
    });
  } catch (error) {
    logger.warn('readiness_check_failed', {
      requestId: res.locals.requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(503).json({
      success: false,
      error: 'Service unavailable',
      data: { status: 'not_ready', timestamp: new Date().toISOString(), version: config.releaseVersion },
    });
  }
}
