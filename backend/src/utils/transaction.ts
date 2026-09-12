import { Prisma } from '@prisma/client';
import prisma from '../config/database';

const MAX_TRANSACTION_ATTEMPTS = 3;

/**
 * Run a business invariant at PostgreSQL's serializable isolation level.
 * Prisma reports write conflicts/deadlocks as P2034; retrying the complete
 * unit of work prevents partial state and stale-read inventory deductions.
 */
export async function withSerializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (!retryable || attempt === MAX_TRANSACTION_ATTEMPTS) throw error;
    }
  }

  throw new Error('Serializable transaction retry loop exhausted');
}
