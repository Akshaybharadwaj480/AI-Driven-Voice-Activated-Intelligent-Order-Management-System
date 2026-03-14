'use client';

import { FormEvent, useState } from 'react';
import AppShell from '../../components/AppShell';
import ApiErrorBanner from '../../components/ApiErrorBanner';
import OperationPanel from '../../components/OperationPanel';
import StatsGrid from '../../components/StatsGrid';
import { useOrderStats } from '../../hooks/useOrderStats';
import { cancelOrderById, normalizeOrderId, type Order } from '../../lib/orderStore';

export default function CancelOrderPage() {
  const { stats, error } = useOrderStats();
  const [orderId, setOrderId] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [cancelledOrder, setCancelledOrder] = useState<Order | null>(null);

  const onCancel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setCancelledOrder(null);

    if (!orderId.trim()) {
      setFeedback('Please enter an order ID to cancel.');
      return;
    }

    try {
      setCancelling(true);
      const order = await cancelOrderById(orderId);

      if (!order) {
        setFeedback(`Order ${normalizeOrderId(orderId)} not found.`);
        return;
      }

      setCancelledOrder(order);
      setFeedback('Your order has been cancelled.');
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AppShell
      title="Cancel Order"
      subtitle="Cancel any active order by ID and keep clear audit-friendly status history."
    >
      <ApiErrorBanner message={error} />
      <StatsGrid stats={stats} />

      <OperationPanel
        title="Cancel Existing Order"
        description="Use this panel for fast cancellation requests."
        toneClassName="bg-[#fff5f5] border-[#f6cccc]"
      >
        <form onSubmit={onCancel} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Order ID
            <input
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              placeholder="ORD-005"
              className="mt-1 w-full rounded-xl border border-[#d8ceb9] bg-white px-3 py-2 text-slate-800 outline-none ring-[#ef4444] focus:ring"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={cancelling}
              className="w-full rounded-xl bg-[#dc2626] px-4 py-2.5 font-semibold text-white transition hover:bg-[#b91c1c] disabled:opacity-60"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          </div>
        </form>

        {feedback ? (
          <div className="mt-4 rounded-xl border border-[#f5cccc] bg-white p-3 text-sm text-[#9f1239]">{feedback}</div>
        ) : null}

        {cancelledOrder ? (
          <div className="mt-4 rounded-2xl border border-[#f6d3d3] bg-[#fff1f2] p-4 text-sm text-[#9f1239]">
            <p className="font-semibold">Cancelled: {cancelledOrder.id}</p>
            <p>Product: {cancelledOrder.productName}</p>
            <p>Status: {cancelledOrder.status}</p>
            <p>Customer: {cancelledOrder.customer}</p>
          </div>
        ) : null}
      </OperationPanel>
    </AppShell>
  );
}
