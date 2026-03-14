'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AppShell from '../../components/AppShell';
import ApiErrorBanner from '../../components/ApiErrorBanner';
import StatsGrid from '../../components/StatsGrid';
import VoiceCommand from '../../components/VoiceCommand';
import { useOrderStats } from '../../hooks/useOrderStats';
import type { OrderStats } from '../../lib/orderStore';

export default function VoicePage() {
  const { stats, error } = useOrderStats();
  const [liveStats, setLiveStats] = useState<OrderStats>(stats);
  const [lastCommand, setLastCommand] = useState('');

  useEffect(() => {
    setLiveStats(stats);
  }, [stats]);

  return (
    <AppShell
      title="Voice Command Studio"
      subtitle="Speak naturally to create, modify, track, or cancel orders. The AI assistant understands intent and executes actions instantly."
    >
      <ApiErrorBanner message={error} />
      <StatsGrid stats={liveStats} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <VoiceCommand onCommand={setLastCommand} onStatsUpdate={setLiveStats} />
        </div>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-5"
        >
          <h3 className="text-lg font-semibold text-slate-800">Live Voice Session</h3>
          <p className="mt-1 text-sm text-slate-600">Last recognized command:</p>
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
            {lastCommand || 'No command captured yet.'}
          </p>

          <div className="mt-5 rounded-lg border border-dashed border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">
            <p className="font-semibold">Voice tips</p>
            <p>Speak one command at a time for best intent detection.</p>
            <p>Use order IDs like ORD-003 for track/cancel/modify actions.</p>
          </div>
        </motion.aside>
      </div>
    </AppShell>
  );
}
