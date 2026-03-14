'use client';

import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import ApiErrorBanner from '../../components/ApiErrorBanner';
import StatsGrid from '../../components/StatsGrid';
import OrderList from '../../components/OrderList';
import { useOrderStats } from '../../hooks/useOrderStats';
import type { OrderStats } from '../../lib/orderStore';

export default function OrdersPage() {
  const { stats, error } = useOrderStats();
  const [liveStats, setLiveStats] = useState<OrderStats>(stats);

  useEffect(() => {
    setLiveStats(stats);
  }, [stats]);

  return (
    <AppShell
      title="Order Management Board"
      subtitle="Review all active orders in one place. Order status updates are synced in real time with voice actions."
    >
      <ApiErrorBanner message={error} />
      <StatsGrid stats={liveStats} />
      <OrderList onStatsUpdate={setLiveStats} title="All Orders" />
    </AppShell>
  );
}
