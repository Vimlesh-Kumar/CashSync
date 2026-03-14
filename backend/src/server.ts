import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import type { CorsOptions } from 'cors';
import { appLogger } from './base/log';
import { registerAllFeatures } from './features';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = new Set((process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0));

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, Postman, server-to-server).
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    try {
      const requestOrigin = new URL(origin);
      const isSecureOrigin = requestOrigin.protocol === 'https:';
      const isLocalDevOrigin = isLoopbackHost(requestOrigin.hostname);

      if (isSecureOrigin || isLocalDevOrigin) {
        callback(null, true);
        return;
      }
    } catch {
      // Invalid origin format will be rejected below.
    }

    if (process.env.ENV_CONTEXT === 'DEVELOPMENT' && allowedOrigins.size === 0) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'CashSync Backend is running' });
});

registerAllFeatures(app);

app.listen(port, () => {
  appLogger.info('server.started', { port });
});
