'use client';

import { AlertTriangle } from 'lucide-react';

interface ApiErrorBannerProps {
  message: string | null;
}

export default function ApiErrorBanner({ message }: ApiErrorBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
