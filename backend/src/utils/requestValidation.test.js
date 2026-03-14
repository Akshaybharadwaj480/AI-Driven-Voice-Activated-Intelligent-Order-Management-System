import { describe, expect, it } from 'vitest';
import {
  isValidStatus,
  sanitizeAmount,
  sanitizeCustomerName,
  sanitizeItems,
  sanitizeVoiceCommand,
} from './requestValidation.js';

describe('requestValidation', () => {
  it('sanitizes customer name with fallback', () => {
    expect(sanitizeCustomerName('  Riya   Sharma  ')).toBe('Riya Sharma');
    expect(sanitizeCustomerName('', 'Guest')).toBe('Guest');
  });

  it('sanitizes amount and rejects negative values', () => {
    expect(sanitizeAmount('450')).toBe(450);
    expect(sanitizeAmount(-3)).toBeNull();
  });

  it('normalizes request items', () => {
    const items = sanitizeItems([
      { name: ' Pizza ', qty: 2 },
      { name: 'Coke', qty: 1 },
    ]);

    expect(items).toEqual([
      { name: 'pizza', qty: 2 },
      { name: 'coke', qty: 1 },
    ]);
  });

  it('validates statuses and command bounds', () => {
    expect(isValidStatus('processing')).toBe(true);
    expect(isValidStatus('queued')).toBe(false);

    expect(sanitizeVoiceCommand('track order 3')).toBe('track order 3');
    expect(sanitizeVoiceCommand('   ')).toBeNull();
  });
});
