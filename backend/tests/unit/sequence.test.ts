import { describe, expect, it, vi } from 'vitest';
import { generateSequenceNumber } from '../../src/utils/sequence';

describe('generateSequenceNumber', () => {
  it('atomically increments a database counter', async () => {
    const upsert = vi.fn().mockResolvedValue({ value: 42 });
    const client = { sequenceCounter: { upsert } } as any;

    const result = await generateSequenceNumber('PO', 'purchaseOrder', client);

    expect(result).toMatch(/^PO-\d{4}-042$/);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { value: { increment: 1 } },
      select: { value: true },
    }));
  });
});
