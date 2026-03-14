'use client';

import { FormEvent, useState } from 'react';
import AppShell from '../../components/AppShell';
import ApiErrorBanner from '../../components/ApiErrorBanner';
import OperationPanel from '../../components/OperationPanel';
import StatsGrid from '../../components/StatsGrid';
import { useOrderStats } from '../../hooks/useOrderStats';
import { normalizeOrderId, replaceOrderProduct, type Order, type ShoppingPlatform } from '../../lib/orderStore';

function buildPlatformUrl(platform: ShoppingPlatform | null, productName: string) {
  const query = encodeURIComponent(productName.trim());
  if (!query || !platform) {
    return null;
  }

  if (platform === 'amazon') {
    return `https://www.amazon.in/s?k=${query}`;
  }

  return `https://www.flipkart.com/search?q=${query}`;
}

export default function ModifyOrderPage() {
  const { stats, error } = useOrderStats();
  const [orderId, setOrderId] = useState('');
  const [productName, setProductName] = useState('');
  const [platform, setPlatform] = useState<ShoppingPlatform | ''>('');
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [updatedOrder, setUpdatedOrder] = useState<Order | null>(null);

  const onModify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setUpdatedOrder(null);

    if (!orderId.trim() || !productName.trim()) {
      setFeedback('Please provide both order ID and product name.');
      return;
    }

    try {
      setUpdating(true);
      const updated = await replaceOrderProduct(orderId, {
        productName,
        platform: platform || null,
      });

      if (!updated) {
        setFeedback(`Order ${normalizeOrderId(orderId)} not found.`);
        return;
      }

      setUpdatedOrder(updated);
      const searchUrl = buildPlatformUrl(platform || null, productName);
      if (searchUrl) {
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
        setFeedback('Your order has been updated successfully. Opening platform search now.');
      } else {
        setFeedback('Your order has been updated successfully.');
      }
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : 'Failed to update order');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AppShell
      title="Modify Order"
      subtitle="Update an existing order with a new product and optional shopping platform."
    >
      <ApiErrorBanner message={error} />
      <StatsGrid stats={stats} />

      <OperationPanel
        title="Update Existing Order"
        description="Change product details while preserving order history."
        toneClassName="bg-[#fffaf2] border-[#f2d7ad]"
      >
        <form onSubmit={onModify} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Order ID
            <input
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              placeholder="ORD-002"
              className="mt-1 w-full rounded-xl border border-[#d8ceb9] bg-white px-3 py-2 text-slate-800 outline-none ring-[#0f766e] focus:ring"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            New Product
            <input
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="Headphones"
              className="mt-1 w-full rounded-xl border border-[#d8ceb9] bg-white px-3 py-2 text-slate-800 outline-none ring-[#0f766e] focus:ring"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Shopping Platform
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value as ShoppingPlatform | '')}
              className="mt-1 w-full rounded-xl border border-[#d8ceb9] bg-white px-3 py-2 text-slate-800 outline-none ring-[#0f766e] focus:ring"
            >
              <option value="">Keep existing / none</option>
              <option value="amazon">Amazon</option>
              <option value="flipkart">Flipkart</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={updating}
              className="w-full rounded-xl bg-[#d97706] px-4 py-2.5 font-semibold text-white transition hover:bg-[#b45309] disabled:opacity-60"
            >
              {updating ? 'Updating...' : 'Modify Order'}
            </button>
          </div>
        </form>

        {feedback ? (
          <div className="mt-4 rounded-xl border border-[#f0d7ae] bg-white p-3 text-sm text-[#7a4e17]">{feedback}</div>
        ) : null}

        {updatedOrder ? (
          <div className="mt-4 rounded-2xl border border-[#f7e3c0] bg-[#fff9ed] p-4 text-sm text-[#7a4e17]">
            <p className="font-semibold">Updated: {updatedOrder.id}</p>
            <p>Product: {updatedOrder.productName}</p>
            <p>Platform: {updatedOrder.platform || 'none'}</p>
            <p>Status: {updatedOrder.status}</p>
          </div>
        ) : null}
      </OperationPanel>
    </AppShell>
  );
}
