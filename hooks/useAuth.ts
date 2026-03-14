'use client';

import { useEffect, useState } from 'react';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

interface StoredSession {
  token: string;
  user: User;
  expiresAt: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
const STORAGE_KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY || 'user';
const GUEST_USER: User = {
  uid: 'guest-user',
  email: 'guest@ai-vaom.local',
  displayName: 'Guest Operator',
  photoURL: 'https://ui-avatars.com/api/?name=Guest+Operator',
};

function getStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredSession;

    if (!parsed?.token || !parsed?.user || !Number.isFinite(parsed?.expiresAt)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

async function requestAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || 'Authentication request failed');
  }

  return body as T;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;

    const setGuestMode = () => {
      if (disposed) {
        return;
      }

      setUser(GUEST_USER);
      setToken(null);
      setExpiresAt(0);
      setAuthError(null);
    };

    const bootstrapAuth = async () => {
      const stored = getStoredSession();

      if (!stored) {
        setGuestMode();
        setLoading(false);
        return;
      }

      if (stored.expiresAt <= Date.now()) {
        window.localStorage.removeItem(STORAGE_KEY);
        setGuestMode();
        setLoading(false);
        return;
      }

      try {
        const data = await requestAuth<{ success: boolean; user: User; expiresAt: number }>('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${stored.token}`,
          },
        });

        if (disposed) {
          return;
        }

        const nextSession: StoredSession = {
          token: stored.token,
          user: data.user,
          expiresAt: Number(data.expiresAt) || stored.expiresAt,
        };

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
        setToken(nextSession.token);
        setUser(nextSession.user);
        setExpiresAt(nextSession.expiresAt);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        setGuestMode();
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    bootstrapAuth();

    return () => {
      disposed = true;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setAuthError(null);

    try {
      const data = await requestAuth<{ success: boolean; token: string; user: User; expiresAt: number }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email: email.trim(), password }),
        },
      );

      const nextSession: StoredSession = {
        token: data.token,
        user: data.user,
        expiresAt: Number(data.expiresAt) || Date.now() + 24 * 60 * 60 * 1000,
      };

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      }

      setToken(nextSession.token);
      setUser(nextSession.user);
      setExpiresAt(nextSession.expiresAt);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      setAuthError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (token) {
        await requestAuth<{ success: boolean }>('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {
      // Swallow sign-out network errors and clear local auth state.
    }

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    setUser(GUEST_USER);
    setToken(null);
    setExpiresAt(0);
    setAuthError(null);
  };

  return {
    user,
    token,
    expiresAt,
    loading,
    authError,
    signIn,
    signOut,
    clearAuthError: () => setAuthError(null),
  };
}

export default useAuth;