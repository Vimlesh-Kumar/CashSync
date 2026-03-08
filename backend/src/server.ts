import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { appLogger } from './base/log';
import { registerAllFeatures } from './features';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'CashSync Backend is running' });
});

registerAllFeatures(app);

app.listen(port, () => {
  appLogger.info('server.started', { port });
});
