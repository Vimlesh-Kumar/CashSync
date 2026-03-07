import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { registerAllFeatures } from './features';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', message: 'CashSync Backend is running' });
});

// ── Register all features ─────────────────────────────────────────────────────
registerAllFeatures(app);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(port, () => {
    console.log(`🚀 CashSync server running on port ${port}`);
});
