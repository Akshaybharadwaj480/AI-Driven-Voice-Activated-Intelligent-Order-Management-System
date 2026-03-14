'use client';

import { FormEvent, useState } from 'react';
import AppShell from '../../components/AppShell';
import ApiErrorBanner from '../../components/ApiErrorBanner';
import OperationPanel from '../../components/OperationPanel';
import StatsGrid from '../../components/StatsGrid';
import { useOrderStats } from '../../hooks/useOrderStats';
import { findOrder, normalizeOrderId, type Order } from '../../lib/orderStore';

export default function TrackOrderPage() {
  const { stats, error } = useOrderStats();
  const [orderId, setOrderId] = useState('');
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);

  const onTrack = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setTrackedOrder(null);

    if (!orderId.trim()) {
      setFeedback('Please enter an order ID to track.');
      return;
    }

    try {
      setChecking(true);
      const order = await findOrder(orderId);

      if (!order) {
        setFeedback(`Order ${normalizeOrderId(orderId)} not found.`);
        return;
      }

      setTrackedOrder(order);
      setFeedback(`Order ${order.id} status fetched successfully.`);
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : 'Failed to track order');
    } finally {
      setChecking(false);
    }
  };

  return (
    <AppShell
      title="Track Order"
      subtitle="Check current status and product details for a specific order ID."
    >
      <ApiErrorBanner message={error} />
      <StatsGrid stats={stats} />

      <OperationPanel
        title="Track By Order ID"
        description="Retrieve real-time order state from MongoDB-backed API."
        toneClassName="bg-[#f3f9ff] border-[#c7e4ff]"
      >
        <form onSubmit={onTrack} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Order ID
            <input
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              placeholder="ORD-004"
              className="mt-1 w-full rounded-xl border border-[#d8ceb9] bg-white px-3 py-2 text-slate-800 outline-none ring-[#0f766e] focus:ring"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={checking}
              className="w-full rounded-xl bg-[#1d4ed8] px-4 py-2.5 font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-60"
            >
              {checking ? 'Tracking...' : 'Track Order'}
            </button>
          </div>
        </form>

        {feedback ? (
          <div className="mt-4 rounded-xl border border-[#cde3ff] bg-white p-3 text-sm text-[#1e3a8a]">{feedback}</div>
        ) : null}

        {trackedOrder ? (
          <div className="mt-4 rounded-2xl border border-[#d9eaff] bg-[#f3f9ff] p-4 text-sm text-[#1e3a8a]">
            <p className="font-semibold">Order: {trackedOrder.id}</p>
            <p>Product: {trackedOrder.productName}</p>
            <p>Platform: {trackedOrder.platform || 'none'}</p>
            <p>Status: {trackedOrder.status}</p>
            <p>Customer: {trackedOrder.customer}</p>
          </div>
        ) : null}
      </OperationPanel>
    </AppShell>
  );
}
