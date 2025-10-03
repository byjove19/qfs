// src/routes/deposit.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { 
  getDepositPage,
  processDeposit,
  submitDepositPayment 
} from '../controllers/depositController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);

// Page route (renders deposit page)
router.get('/', getDepositPage);

// API routes for deposit processing
router.post('/submit', 
  [
    body('amount').isFloat({ min: 100 }).withMessage('Minimum amount is $100'),
    body('currency').isIn(['BTC', 'ETH', 'LTC', 'DOGE', 'XDC', 'XLM', 'MATIC', 'XRP', 'ALGO', 'USDT', 'USDC', 'SOL']),
    body('network').optional().isString()
  ],
  processDeposit
);

router.post('/payment', submitDepositPayment);

export default router;