import dotenv from 'dotenv';

dotenv.config();

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const frontendOrigins = String(process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT || 4000),
  frontendOrigins,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
  mongoDbName: process.env.MONGODB_DB_NAME || 'ai_vaom',
  mongoOrdersCollection: process.env.MONGODB_ORDERS_COLLECTION || 'orders',
  pythonExecutable: String(process.env.PYTHON_EXECUTABLE || '').trim(),
  enablePythonBrowserOpen: String(process.env.ENABLE_PYTHON_BROWSER_OPEN || 'true').trim().toLowerCase() !== 'false',
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '20kb',
  rateLimitWindowMs: toPositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMaxRequests: toPositiveInt(process.env.RATE_LIMIT_MAX_REQUESTS, 300),
  authUserEmail: String(process.env.AUTH_USER_EMAIL || '').trim().toLowerCase(),
  authUserPassword: String(process.env.AUTH_USER_PASSWORD || ''),
  authUserDisplayName: String(process.env.AUTH_USER_DISPLAY_NAME || 'Operations Admin').trim(),
  authUserPhotoUrl: String(process.env.AUTH_USER_PHOTO_URL || 'https://ui-avatars.com/api/?name=Operations+Admin'),
  authSessionTtlMs: toPositiveInt(process.env.AUTH_SESSION_TTL_MS, 24 * 60 * 60 * 1000),
};
