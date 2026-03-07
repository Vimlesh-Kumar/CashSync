import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

import { transactionRoutes } from './features/transaction';
import { userRoutes } from './features/user';

app.use(cors());
app.use(express.json());

app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'CashSync Backend is running' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
