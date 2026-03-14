'use client';

import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function OnboardingFlow() {
  const { signIn, authError, clearAuthError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const features = [
    {
      title: 'Voice-Activated Orders',
      description: 'Create and manage orders using natural voice commands',
    },
    {
      title: 'Real-Time Tracking',
      description: 'Monitor order status and analytics in real-time',
    },
    {
      title: 'Smart Analytics',
      description: 'Get insights into your business performance',
    },
  ];

  const submitSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearAuthError();
    setLocalError(null);

    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter both email and password.');
      return;
    }

    try {
      setIsSigningIn(true);
      await signIn(email.trim(), password);
    } catch {
      setLocalError('Unable to sign in right now. Please retry.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="app-bg min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-card w-full max-w-lg overflow-hidden"
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="mb-2 text-4xl font-semibold text-[#132231]">
              AI-VAOM
            </h1>
            <p className="text-gray-600">Voice-first control room for intelligent order operations</p>
          </div>

          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#cde7df] bg-[#f1fcf9] p-4 text-sm text-[#0f766e]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Secure login enabled</p>
              <p>Use backend credentials. Session is validated with the API.</p>
            </div>
          </div>

          <div className="mb-8 space-y-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="rounded-2xl border border-[#eadfcf] bg-[#fffaf3] p-4"
              >
                <div>
                  <h3 className="font-semibold text-[#1e293b]">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {(localError || authError) && (
            <p className="mb-3 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{localError || authError}</span>
            </p>
          )}

          <form onSubmit={submitSignIn} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-[#d9cbb5] bg-white px-3 py-2 text-slate-800 outline-none ring-[#0f766e] focus:ring"
              placeholder="name@example.com"
            />

            <label className="block text-sm font-medium text-gray-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-[#d9cbb5] bg-white px-3 py-2 text-slate-800 outline-none ring-[#0f766e] focus:ring"
              placeholder="Enter your password"
            />

            <button
              type="submit"
              disabled={isSigningIn}
              className="w-full rounded-xl bg-gradient-to-r from-[#0f766e] to-[#1d4ed8] px-4 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isSigningIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}