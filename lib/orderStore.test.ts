import { describe, expect, it } from 'vitest';
import { getOrderStats, normalizeOrderId, type Order } from './orderStore';

describe('orderStore helpers', () => {
  it('normalizes order ids from plain numbers', () => {
    expect(normalizeOrderId('7')).toBe('ORD-007');
    expect(normalizeOrderId('ord 25')).toBe('ORD-025');
  });

  it('computes totals, pending count, completed count, and revenue', () => {
    const orders: Order[] = [
      {
        id: 'ORD-001',
        customer: 'Riya',
        productName: 'laptop',
        platform: 'amazon',
        amount: 300,
        status: 'pending',
        items: 2,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ORD-002',
        customer: 'Alex',
        productName: 'running shoes',
        platform: 'flipkart',
        amount: 500,
        status: 'processing',
        items: 3,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ORD-003',
        customer: 'Lee',
        productName: 'headphones',
        platform: null,
        amount: 450,
        status: 'completed',
        items: 2,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ORD-004',
        customer: 'Nia',
        productName: 'smartwatch',
        platform: 'amazon',
        amount: 200,
        status: 'cancelled',
        items: 1,
        createdAt: new Date().toISOString(),
      },
    ];

    expect(getOrderStats(orders)).toEqual({
      totalOrders: 3,
      pendingOrders: 2,
      completedOrders: 1,
      revenue: 1250,
    });
  });
});
