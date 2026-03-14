'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface OperationPanelProps {
  title: string;
  description: string;
  children: ReactNode;
  toneClassName?: string;
}

export default function OperationPanel({
  title,
  description,
  children,
  toneClassName = 'bg-white/90 border-[#eadcc5]',
}: OperationPanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`surface-card p-6 ${toneClassName}`}
    >
      <h3 className="text-2xl font-semibold text-[#17212e]">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}
