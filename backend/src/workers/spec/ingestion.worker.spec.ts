import { describe, it, expect } from 'vitest';
import { buildIngestionFingerprint } from '../ingestion.worker';

describe('Ingestion Worker', () => {
  it('should use transactionId if present', () => {
    const tx: any = { transactionId: 'TX123', amount: 100 };
    expect(buildIngestionFingerprint(tx)).toBe('TX123-100');
  });

  it('should use fingerprint if transactionId is missing', () => {
    const tx: any = { 
        amount: 50, 
        merchant: 'Amazon.com', 
        timestamp: new Date('2024-03-15T10:00:00Z') 
    };
    const fp = buildIngestionFingerprint(tx);
    expect(fp).toContain('F-50-');
    expect(fp).toContain('AMAZONCOM');
  });

  it('should handle missing merchant', () => {
    const tx: any = { 
        amount: 50, 
        timestamp: new Date('2024-03-15T10:10:00Z') 
    };
    const fp = buildIngestionFingerprint(tx);
    expect(fp).toContain('UNKNOWN');
  });
});
