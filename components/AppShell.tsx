'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Mic,
  ListOrdered,
  BarChart3,
  RefreshCcw,
  PlusCircle,
  PencilLine,
  Radar,
  Ban,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AppShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/voice', label: 'Voice Studio', icon: Mic },
  { href: '/create', label: 'Create', icon: PlusCircle },
  { href: '/modify', label: 'Modify', icon: PencilLine },
  { href: '/track', label: 'Track', icon: Radar },
  { href: '/cancel', label: 'Cancel', icon: Ban },
  { href: '/orders', label: 'Orders', icon: ListOrdered },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function AppShell({ title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const activeUser =
    user ||
    ({
      uid: 'guest-user',
      email: 'guest@ai-vaom.local',
      displayName: 'Guest Operator',
      photoURL: 'https://ui-avatars.com/api/?name=Guest+Operator',
    } as const);

  if (loading) {
    return (
      <div className="app-bg min-h-screen flex items-center justify-center p-4">
        <div className="surface-card w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-[#0f766e] border-t-transparent" />
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Initializing</p>
          <p className="mt-2 text-slate-700">Preparing your intelligent order workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/30 bg-[#f9f7f1]/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#8f6f43]">AI Voice Commerce</p>
              <h1 className="text-xl font-semibold text-[#17212e]">Intelligent Order Management</h1>
            </div>

            <div className="flex items-center gap-3 rounded-full border border-[#d7c8ad] bg-white/90 px-3 py-2 shadow-sm">
              <img
                src={activeUser.photoURL || 'https://ui-avatars.com/api/?name=User'}
                alt="User"
                className="h-9 w-9 rounded-full border-2 border-[#0f766e]"
              />
              <div>
                <p className="text-sm font-semibold text-[#1f2937]">{activeUser.displayName}</p>
                <p className="text-xs text-slate-500">{activeUser.email}</p>
              </div>
              <button
                onClick={signOut}
                className="inline-flex items-center gap-2 rounded-full border border-[#e4d7c0] bg-[#fff9f0] px-3 py-1.5 text-xs font-medium text-[#7b4e26] transition hover:bg-[#fff2de]"
                type="button"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset Session
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-[#0f766e] text-white shadow-md'
                      : 'bg-white text-[#1f2937] ring-1 ring-[#e8ddca] hover:bg-[#fffaf1]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card mb-7 p-6"
        >
          <p className="text-xs uppercase tracking-[0.28em] text-[#8f6f43]">Operations Workspace</p>
          <h2 className="mt-2 text-3xl font-semibold text-[#17212e]">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">{subtitle}</p>
        </motion.section>

        {children}
      </main>
    </div>
  );
}
