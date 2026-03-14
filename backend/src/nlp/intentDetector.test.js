import { describe, expect, it } from 'vitest';
import { detectVoiceIntent } from './intentDetector.js';

describe('detectVoiceIntent', () => {
  it('detects create order intent with entities', () => {
    const result = detectVoiceIntent('create order for Riya with 2 pizza and 1 coke');

    expect(result.intent).toBe('create_order');
    expect(result.entities.customerName).toBe('Riya');
    expect(result.entities.items.length).toBeGreaterThan(0);
  });

  it('detects complete order intent', () => {
    const result = detectVoiceIntent('complete order 7');

    expect(result.intent).toBe('complete_order');
    expect(result.entities.orderId).toBe('7');
  });

  it('detects analytics intent', () => {
    const result = detectVoiceIntent('show dashboard stats');

    expect(result.intent).toBe('show_stats');
  });
});
