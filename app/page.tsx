
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mic,
  ListOrdered,
  BarChart3,
  Sparkles,
  PlusCircle,
  PencilLine,
  Radar,
  Ban,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import ApiErrorBanner from '../components/ApiErrorBanner';
import StatsGrid from '../components/StatsGrid';
import { useOrderStats } from '../hooks/useOrderStats';

const routeCards = [
  {
    href: '/create',
    title: 'Create Order',
    description: 'Create a new product order and route to shopping platform in one action.',
    icon: PlusCircle,
    tone: 'bg-[#f7fff8] border-[#c5f3d0] text-[#215d35]',
  },
  {
    href: '/modify',
    title: 'Modify Order',
    description: 'Switch product details and platform for an existing order quickly.',
    icon: PencilLine,
    tone: 'bg-[#fffaf3] border-[#f4d8ab] text-[#7a4a13]',
  },
  {
    href: '/track',
    title: 'Track Order',
    description: 'Check current order status and fulfillment timeline with one lookup.',
    icon: Radar,
    tone: 'bg-[#f3fbff] border-[#b4e6ff] text-[#145e7a]',
  },
  {
    href: '/cancel',
    title: 'Cancel Order',
    description: 'Cancel incorrect or duplicate orders with clear confirmation.',
    icon: Ban,
    tone: 'bg-[#fff6f6] border-[#f4c7c7] text-[#8b2d2d]',
  },
  {
    href: '/voice',
    title: 'Voice Command Studio',
    description: 'Speak naturally and let AI execute create, modify, track, and cancel flows.',
    icon: Mic,
    tone: 'bg-[#effffb] border-[#b5f2df] text-[#0f5f53]',
  },
  {
    href: '/orders',
    title: 'Order Management Board',
    description: 'View all saved orders with product, platform, status, and amount details.',
    icon: ListOrdered,
    tone: 'bg-[#fef8ef] border-[#efd9b6] text-[#7e4f1f]',
  },
  {
    href: '/analytics',
    title: 'Analytics & Insights',
    description: 'Monitor trend lines, completion rates, and revenue indicators from live data.',
    icon: BarChart3,
    tone: 'bg-[#f1fbff] border-[#b8e5ff] text-[#0a5b80]',
  },
];

export default function Home() {
  const { stats, error } = useOrderStats();

  return (
    <AppShell
      title="Overview"
      subtitle="Operate every workflow from dedicated pages: Create, Modify, Track, Cancel, Voice, Orders, and Analytics."
    >
      <ApiErrorBanner message={error} />
      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {routeCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <motion.article
              key={card.href}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`rounded-3xl border p-5 shadow-sm ${card.tone}`}
            >
              <div className="gold-ring mb-3 inline-flex rounded-xl bg-white/70 p-2">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold leading-tight">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed opacity-90">{card.description}</p>
              <Link
                href={card.href}
                className="mt-4 inline-flex rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-white"
              >
                Open Page
              </Link>
            </motion.article>
          );
        })}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-card mt-7 p-5"
      >
        <div className="flex items-center gap-3 text-slate-800">
          <Sparkles className="h-5 w-5 text-[#d97706]" />
          <h3 className="text-lg font-semibold">AI Voice Assistant Mission</h3>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          The assistant listens to voice, converts speech to intent, performs create/cancel/track/modify operations,
          and opens Amazon or Flipkart product search pages whenever requested.
        </p>
      </motion.section>
    </AppShell>
  );
}