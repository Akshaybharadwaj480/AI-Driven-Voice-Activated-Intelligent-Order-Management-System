'use client';

import { motion } from 'framer-motion';
import { ShoppingBag, Clock3, CheckCircle2, Wallet } from 'lucide-react';
import type { OrderStats } from '../lib/orderStore';

interface StatsGridProps {
  stats: OrderStats;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const cards = [
    {
      key: 'totalOrders',
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingBag,
      tone: 'bg-[#eefbf8] text-[#0f766e] border-[#b8eadf]',
    },
    {
      key: 'pendingOrders',
      label: 'Pending',
      value: stats.pendingOrders,
      icon: Clock3,
      tone: 'bg-[#fff7ed] text-[#b45309] border-[#f8d9ab]',
    },
    {
      key: 'completedOrders',
      label: 'Completed',
      value: stats.completedOrders,
      icon: CheckCircle2,
      tone: 'bg-[#f2fff4] text-[#166534] border-[#c8f2d1]',
    },
    {
      key: 'revenue',
      label: 'Revenue',
      value: `$${stats.revenue.toLocaleString()}`,
      icon: Wallet,
      tone: 'bg-[#f1f8ff] text-[#1d4ed8] border-[#bfdcfb]',
    },
  ];

  return (
    <div className="mb-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <motion.article
            key={card.key}
            whileHover={{ y: -4, scale: 1.01 }}
            className={`rounded-3xl border p-5 shadow-sm transition ${card.tone}`}
          >
            <div className="mb-2 flex items-center justify-between gap-4">
              <p className="text-sm font-medium tracking-wide">{card.label}</p>
              <div className="gold-ring rounded-xl bg-white/70 p-2">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-semibold leading-none">{card.value}</p>
          </motion.article>
        );
      })}
    </div>
  );
}
