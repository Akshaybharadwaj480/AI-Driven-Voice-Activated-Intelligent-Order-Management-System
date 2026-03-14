import crypto from 'crypto';
import { config } from '../config.js';

const sessions = new Map();
const MAX_ACTIVE_SESSIONS = 500;

function nowMs() {
  return Date.now();
}

function buildUser() {
  return {
    uid: 'ops-admin',
    email: config.authUserEmail,
    displayName: config.authUserDisplayName || 'Operations Admin',
    photoURL: config.authUserPhotoUrl,
  };
}

function cleanupExpiredSessions() {
  const now = nowMs();

  for (const [token, value] of sessions.entries()) {
    if (value.expiresAt <= now) {
      sessions.delete(token);
    }
  }
}

function safeCompare(left, right) {
  const leftHash = crypto.createHash('sha256').update(String(left)).digest();
  const rightHash = crypto.createHash('sha256').update(String(right)).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

export function validateCredentials(email, password) {
  const safeEmail = String(email || '').trim().toLowerCase();
  const safePassword = String(password || '');

  if (!config.authUserEmail || !config.authUserPassword) {
    return false;
  }

  return safeCompare(safeEmail, config.authUserEmail) && safeCompare(safePassword, config.authUserPassword);
}

export function createSession() {
  cleanupExpiredSessions();

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = nowMs() + config.authSessionTtlMs;
  const user = buildUser();

  if (sessions.size >= MAX_ACTIVE_SESSIONS) {
    const oldestToken = sessions.keys().next().value;
    if (oldestToken) {
      sessions.delete(oldestToken);
    }
  }

  sessions.set(token, { user, expiresAt });

  return {
    token,
    user,
    expiresAt,
  };
}

export function getSession(token) {
  if (!token) {
    return null;
  }

  cleanupExpiredSessions();
  const session = sessions.get(token);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= nowMs()) {
    sessions.delete(token);
    return null;
  }

  return session;
}

export function revokeSession(token) {
  if (!token) {
    return false;
  }

  return sessions.delete(token);
}
