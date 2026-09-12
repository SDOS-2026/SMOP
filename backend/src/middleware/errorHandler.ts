import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Global error handling middleware.
 * Must be registered LAST in the middleware chain.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = res.locals?.requestId as string | undefined;

  const errorType = err.constructor?.name;
  const isKnownFrameworkError = errorType === 'PrismaClientKnownRequestError' || errorType === 'ZodError';
  if (err instanceof AppError || isKnownFrameworkError) {
    logger.warn('operational_error', {
      requestId,
      statusCode: err instanceof AppError ? err.statusCode : undefined,
      error: err.message,
    });
  } else {
    logger.error('unhandled_request_error', err, { requestId });
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(requestId && { requestId }),
    });
    return;
  }

  // Prisma known errors
  if (err.constructor?.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      const target = prismaErr.meta?.target;
      res.status(409).json({
        success: false,
        error: `Duplicate value for field: ${Array.isArray(target) ? target.join(', ') : target}`,
        ...(requestId && { requestId }),
      });
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Record not found',
        ...(requestId && { requestId }),
      });
      return;
    }
  }

  // Zod validation errors
  if (err.constructor?.name === 'ZodError') {
    const zodErr = err as any;
    res.status(422).json({
      success: false,
      error: 'Validation failed',
      message: zodErr.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; '),
      ...(requestId && { requestId }),
    });
    return;
  }

  // Fallback for unexpected errors
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
    ...(requestId && { requestId }),
  });
}
