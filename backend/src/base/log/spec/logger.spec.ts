import { describe, it, expect, vi } from 'vitest';
import { Logger } from '../logger';
import { LogWritter } from '../writter';

describe('Logger', () => {
  it('should emit log entries', () => {
    const mockWritter = { write: vi.fn() } as unknown as LogWritter;
    const logger = new Logger('test', mockWritter);
    
    logger.info('hello', { foo: 'bar' });
    
    expect(mockWritter.write).toHaveBeenCalledWith(expect.objectContaining({
      level: 'INFO',
      scope: 'test',
      message: 'hello',
      meta: { foo: 'bar' }
    }));
  });

  it('should handle different levels', () => {
    const mockWritter = { write: vi.fn() } as unknown as LogWritter;
    const logger = new Logger('test', mockWritter);
    
    logger.error('oops');
    expect(mockWritter.write).toHaveBeenCalledWith(expect.objectContaining({ level: 'ERROR' }));
    
    logger.warn('careful');
    expect(mockWritter.write).toHaveBeenCalledWith(expect.objectContaining({ level: 'WARN' }));
  });
});
