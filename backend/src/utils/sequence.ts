import prisma from '../config/database';
import { Prisma, PrismaClient } from '@prisma/client';

type SequenceClient = PrismaClient | Prisma.TransactionClient;

/**
 * Generate sequential document numbers like PO-2024-001, ENQ-2024-001 etc.
 */
export async function generateSequenceNumber(
  prefix: string,
  _model: 'purchaseOrder' | 'supplierEnquiry' | 'supplierQuotation' | 'materialReceipt' | 'materialInspection' | 'materialBatch' | 'customerEnquiry' | 'customerQuotation' | 'customerOrder' | 'productionOrder',
  client: SequenceClient = prisma,
): Promise<string> {
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  const counter = await client.sequenceCounter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
    select: { value: true },
  });

  return `${key}-${String(counter.value).padStart(3, '0')}`;
}
