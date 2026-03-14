import { describe, it, expect, vi } from 'vitest';
import { emailService } from '../email.service';
import { queueService } from '../queue.service';
import { bankApiService } from '../bank-api.service';

vi.mock('../../parsers/email/gmailParser', () => ({
    parseGmailTransaction: vi.fn(() => ({ amount: 100 }))
}));

vi.mock('../../parsers/email/outlookParser', () => ({
    parseOutlookTransaction: vi.fn(() => ({ amount: 200 }))
}));

vi.mock('../../parsers/api/bankApiParser', () => ({
    parseBankApiPayload: vi.fn(() => null)
}));

describe('Other Services', () => {
  describe('EmailService', () => {
    it('should call gmail parser', () => {
      const res = emailService.parseGmail('sub', 'snip');
      expect(res?.amount).toBe(100);
    });

    it('should call outlook parser', () => {
      const res = emailService.parseOutlook('sub', 'body');
      expect(res?.amount).toBe(200);
    });
  });

  describe('QueueService', () => {
    it('should return queued status', () => {
        const res = queueService.enqueueParsingJob({ id: 1 });
        expect(res.queued).toBe(true);
        expect(res.payload).toEqual({ id: 1 });
    });
  });

  describe('BankApiService', () => {
    it('should parse payload', () => {
        expect(bankApiService.parse({})).toBeNull();
    });
    
    it('should fetch transactions', async () => {
        const res = await bankApiService.fetchTransactions('u1');
        expect(res).toEqual([]);
    });
  });
});
