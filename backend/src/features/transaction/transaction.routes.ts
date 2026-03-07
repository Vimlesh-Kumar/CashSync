import { Router } from 'express';
import { createTransaction, getTransactions } from './transaction.controller';

const router = Router();

router.get('/', getTransactions);
router.post('/', createTransaction);

export default router;
