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

  it('detects browse product intent for conversational requests', () => {
    const result = detectVoiceIntent('I need a gaming laptop from Amazon');

    expect(result.intent).toBe('browse_product');
    expect(result.entities.platform).toBe('amazon');
    expect(result.entities.productName).toContain('gaming laptop');
  });

  it('detects create order intent when using order as a verb', () => {
    const result = detectVoiceIntent('order a phone from flipkart');

    expect(result.intent).toBe('create_order');
    expect(result.entities.platform).toBe('flipkart');
    expect(result.entities.productName).toContain('phone');
  });

  it('detects order command', () => {
    const result = detectVoiceIntent('order iphone from amazon');

    expect(result.intent).toBe('create_order');
    expect(result.entities.platform).toBe('amazon');
    expect(result.entities.productName).toContain('iphone');
  });

  it('detects buy command', () => {
    const result = detectVoiceIntent('buy laptop');

    expect(result.intent).toBe('create_order');
    expect(result.entities.productName).toContain('laptop');
  });

  it('detects search command', () => {
    const result = detectVoiceIntent('search shoes on flipkart');

    expect(result.intent).toBe('browse_product');
    expect(result.entities.platform).toBe('flipkart');
    expect(result.entities.productName).toContain('shoes');
  });

  it('detects cancel order command', () => {
    const result = detectVoiceIntent('cancel order 12');

    expect(result.intent).toBe('cancel_order');
    expect(result.entities.orderId).toBe('12');
  });

  it('detects track order command', () => {
    const result = detectVoiceIntent('track order 9');

    expect(result.intent).toBe('track_order');
    expect(result.entities.orderId).toBe('9');
  });
});
