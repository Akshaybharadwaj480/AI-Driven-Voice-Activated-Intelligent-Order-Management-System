'use client';

import { useEffect, useState } from 'react';
import { ORDER_UPDATE_EVENT, getOrderStats, getOrders, initializeOrders, type OrderStats } from '../lib/orderStore';

const EMPTY_STATS: OrderStats = {
  totalOrders: 0,
  pendingOrders: 0,
  completedOrders: 0,
  revenue: 0,
};

export function useOrderStats() {
  const [stats, setStats] = useState<OrderStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    const refresh = async () => {
      try {
        const orders = await getOrders();
        if (!disposed) {
          setStats(getOrderStats(orders));
          setError(null);
        }
      } catch (cause) {
        if (!disposed) {
          setStats(EMPTY_STATS);
          setError(cause instanceof Error ? cause.message : 'Unable to fetch order stats');
        }
      }
    };

    initializeOrders()
      .then((orders) => {
        if (!disposed) {
          setStats(getOrderStats(orders));
          setError(null);
        }
      })
      .catch((cause) => {
        if (!disposed) {
          setStats(EMPTY_STATS);
          setError(cause instanceof Error ? cause.message : 'Unable to fetch order stats');
        }
      })
      .finally(() => {
        if (!disposed) {
          setIsLoading(false);
        }
      });

    window.addEventListener(ORDER_UPDATE_EVENT, refresh);

    return () => {
      disposed = true;
      window.removeEventListener(ORDER_UPDATE_EVENT, refresh);
    };
  }, []);

  return { stats, isLoading, error };
}
