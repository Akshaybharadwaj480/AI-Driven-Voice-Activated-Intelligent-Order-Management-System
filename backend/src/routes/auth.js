import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createSession, getSession, revokeSession, validateCredentials } from '../auth/sessionStore.js';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again later.' },
});

function readBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const [scheme, value] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) {
    return null;
  }

  return value.trim();
}

router.post('/login', loginLimiter, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password || email.length > 120 || password.length > 200) {
    return res.status(400).json({ success: false, message: 'email and password are required' });
  }

  if (!validateCredentials(email, password)) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const session = createSession();

  return res.json({
    success: true,
    token: session.token,
    user: session.user,
    expiresAt: session.expiresAt,
  });
});

router.get('/me', (req, res) => {
  const token = readBearerToken(req);
  const session = getSession(token);

  if (!session) {
    return res.status(401).json({ success: false, message: 'Session expired or invalid' });
  }

  return res.json({ success: true, user: session.user, expiresAt: session.expiresAt });
});

router.post('/logout', (req, res) => {
  const token = readBearerToken(req);

  if (token) {
    revokeSession(token);
  }

  return res.json({ success: true });
});

export default router;
