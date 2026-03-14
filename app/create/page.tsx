'use client';

import { FormEvent, useState } from 'react';
import AppShell from '../../components/AppShell';
import ApiErrorBanner from '../../components/ApiErrorBanner';
import OperationPanel from '../../components/OperationPanel';
import StatsGrid from '../../components/StatsGrid';
import { useOrderStats } from '../../hooks/useOrderStats';
import { createProductOrder, type Order, type ShoppingPlatform } from '../../lib/orderStore';

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

export default function CreateOrderPage() {
  const { stats, error } = useOrderStats();
  const [customer, setCustomer] = useState('Walk-in Customer');
  const [productName, setProductName] = useState('');
  const [platform, setPlatform] = useState<ShoppingPlatform | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setCreatedOrder(null);

    if (!productName.trim()) {
      setFeedback('Please enter a product name.');
      return;
    }

    try {
      setSubmitting(true);
      const order = await createProductOrder({
        customer,
        productName,
        platform: platform || null,
      });
      setCreatedOrder(order);

      const searchUrl = buildPlatformUrl(platform || null, productName);
      if (searchUrl) {
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
        setFeedback(`Your order has been created successfully. Opening ${platform} search now.`);
      } else {
        setFeedback('Your order has been created successfully.');
      }
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Create Order"
      subtitle="Create product orders manually. If platform is Amazon or Flipkart, product search opens automatically."
    >
      <ApiErrorBanner message={error} />
      <StatsGrid stats={stats} />

      <OperationPanel
        title="New Product Order"
        description="Create a fresh order entry and launch platform search in one flow."
        toneClassName="bg-[#f5fff8] border-[#caefd8]"
      >
        <form onSubmit={onCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Customer Name
            <input
              value={customer}
              onChange={(event) => setCustomer(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d8ceb9] bg-white px-3 py-2 text-slate-800 outline-none ring-[#0f766e] focus:ring"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Product Name
            <input
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="Laptop"
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
              <option value="">None</option>
              <option value="amazon">Amazon</option>
              <option value="flipkart">Flipkart</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#0f766e] px-4 py-2.5 font-semibold text-white transition hover:bg-[#115e59] disabled:opacity-60"
            >
              {submitting ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>

        {feedback ? (
          <div className="mt-4 rounded-xl border border-[#c9e8d8] bg-white p-3 text-sm text-[#0f5132]">{feedback}</div>
        ) : null}

        {createdOrder ? (
          <div className="mt-4 rounded-2xl border border-[#d8e9ff] bg-[#f5f9ff] p-4 text-sm text-[#1e3a8a]">
            <p className="font-semibold">Created: {createdOrder.id}</p>
            <p>Product: {createdOrder.productName}</p>
            <p>Platform: {createdOrder.platform || 'none'}</p>
            <p>Status: {createdOrder.status}</p>
          </div>
        ) : null}
      </OperationPanel>
    </AppShell>
  );
}
