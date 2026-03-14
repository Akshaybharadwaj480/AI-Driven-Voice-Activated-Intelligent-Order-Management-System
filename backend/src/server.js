import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { ensureMongoConnection, getMongoConnectionState } from './db/mongoClient.js';
import authRouter from './routes/auth.js';
import ordersRouter from './routes/orders.js';
import voiceRouter from './routes/voice.js';

const app = express();

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients and server-to-server traffic with no origin header.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (config.frontendOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin denied'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);
app.use(express.json({ limit: config.requestBodyLimit }));

app.use(
  '/api',
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/health', async (_req, res) => {
  try {
    await ensureMongoConnection();
    res.json({
      status: 'ok',
      service: 'AI-VAOM Backend',
      database: getMongoConnectionState(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'degraded',
      service: 'AI-VAOM Backend',
      database: getMongoConnectionState(),
      message: 'MongoDB is unavailable',
    });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/voice-command', voiceRouter);

app.use((err, _req, res, _next) => {
  console.error('Unhandled backend error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

async function startServer() {
  try {
    await ensureMongoConnection();
    app.listen(config.port, () => {
      console.log(`AI-VAOM backend running at http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('Failed to connect MongoDB during startup:', error);
    process.exit(1);
  }
}

startServer();
