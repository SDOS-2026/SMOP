import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const suppliedId = req.header('x-request-id');
  const requestId = suppliedId && VALID_REQUEST_ID.test(suppliedId) ? suppliedId : randomUUID();
  const startedAt = process.hrtime.bigint();

  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.once('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info('http_request_completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    });
  });

  next();
}
