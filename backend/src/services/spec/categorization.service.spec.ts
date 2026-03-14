import { describe, it, expect } from 'vitest';
import { autoCategory } from '../categorization.service';

describe('Categorization Service', () => {
  it('should match user rules first', () => {
    const userRules = [{ pattern: 'amazon', category: 'Personal Shopping' }];
    expect(autoCategory('Amazon order', userRules)).toBe('Personal Shopping');
  });

  it('should handle malformed user regex', () => {
    const userRules = [{ pattern: '[', category: 'Error' }];
    expect(autoCategory('Amazon', userRules)).toBe('Shopping');
  });

  it('should match system rules if no user rules match', () => {
    expect(autoCategory('Netflix sub')).toBe('Subscriptions');
    expect(autoCategory('Swiggy order')).toBe('Food & Groceries');
    expect(autoCategory('Uber ride')).toBe('Transport');
  });

  it('should return General if no rules match', () => {
    expect(autoCategory('Something random')).toBe('General');
  });
});
