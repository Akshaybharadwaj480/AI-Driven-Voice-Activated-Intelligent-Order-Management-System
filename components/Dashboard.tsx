'use client';

import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { getOrders, type Order, type OrderStats } from '../lib/orderStore';

interface DashboardProps {
  stats: OrderStats;
}

interface TrendPoint {
  name: string;
  orders: number;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildTrendData(orders: Order[]): TrendPoint[] {
  const today = new Date();
  const dayBuckets = new Map<string, number>();
  const labels: Array<{ key: string; name: string }> = [];

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - index);

    const key = dateKey(date);
    const name = date.toLocaleDateString('en-US', { weekday: 'short' });
    labels.push({ key, name });
    dayBuckets.set(key, 0);
  }

  for (const order of orders) {
    const parsed = new Date(order.createdAt);
    if (Number.isNaN(parsed.getTime())) {
      continue;
    }

    const key = dateKey(parsed);
    if (dayBuckets.has(key)) {
      dayBuckets.set(key, (dayBuckets.get(key) || 0) + 1);
    }
  }

  return labels.map((label) => ({ name: label.name, orders: dayBuckets.get(label.key) || 0 }));
}

export function Dashboard({ stats }: DashboardProps) {
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    const loadTrend = async () => {
      try {
        const orders = await getOrders();
        if (!disposed) {
          setTrendData(buildTrendData(orders));
          setError(null);
        }
      } catch (cause) {
        if (!disposed) {
          setTrendData(buildTrendData([]));
          setError(cause instanceof Error ? cause.message : 'Unable to load trend analytics');
        }
      }
    };

    loadTrend();

    return () => {
      disposed = true;
    };
  }, [stats.totalOrders, stats.pendingOrders, stats.completedOrders, stats.revenue]);

  const chartData = useMemo(() => {
    return trendData.length > 0 ? trendData : buildTrendData([]);
  }, [trendData]);

  const averageOrderValue = stats.totalOrders > 0 ? Math.round(stats.revenue / stats.totalOrders) : 0;
  const completionRate =
    stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card p-6"
    >
      <h2 className="mb-2 text-xl font-semibold text-slate-800">Order Analytics</h2>
      <p className="mb-4 text-sm text-slate-500">Live trend plus KPI snapshot from current orders.</p>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}
      
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="orders" 
              stroke="#0f766e" 
              strokeWidth={2}
              dot={{ fill: '#0f766e' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-cyan-50 p-4">
          <p className="text-sm text-gray-600">Average Order Value</p>
          <p className="text-2xl font-bold text-cyan-700">${averageOrderValue}</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-4">
          <p className="text-sm text-gray-600">Completion Rate</p>
          <p className="text-2xl font-bold text-amber-700">{completionRate}%</p>
        </div>
      </div>
    </motion.div>
  );
}

export default Dashboard;