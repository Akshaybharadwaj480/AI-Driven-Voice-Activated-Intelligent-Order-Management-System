'use client';

import ApiErrorBanner from '../../components/ApiErrorBanner';
import AppShell from '../../components/AppShell';
import StatsGrid from '../../components/StatsGrid';
import { Dashboard } from '../../components/Dashboard';
import { useOrderStats } from '../../hooks/useOrderStats';

export default function AnalyticsPage() {
  const { stats, error } = useOrderStats();

  return (
    <AppShell
      title="Intelligence & Analytics"
      subtitle="Monitor operational KPIs and order velocity trends generated from your live order stream."
    >
      <ApiErrorBanner message={error} />
      <StatsGrid stats={stats} />
      <Dashboard stats={stats} />
    </AppShell>
  );
}
