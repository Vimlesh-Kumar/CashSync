import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleLogRepository } from '../repository';

describe('ConsoleLogRepository', () => {
  let repository: ConsoleLogRepository;
  let logSpy: any;
  let warnSpy: any;
  let errorSpy: any;

  beforeEach(() => {
    repository = new ConsoleLogRepository();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log to console.log by default', () => {
    const entry: any = { level: 'INFO', message: 'test' };
    repository.save(entry);
    expect(logSpy).toHaveBeenCalled();
  });

  it('should log to console.warn for WARN', () => {
    const entry: any = { level: 'WARN', message: 'test' };
    repository.save(entry);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('should log to console.error for ERROR', () => {
    const entry: any = { level: 'ERROR', message: 'test' };
    repository.save(entry);
    expect(errorSpy).toHaveBeenCalled();
  });
});
