// src/routes/transaction.ts
import { Router } from 'express';
import { body, query } from 'express-validator';
import { 
  sendMoney, 
  getTransactions, 
  getTransaction 
} from '../controllers/transactionController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Send money
router.post('/send',
  [
    body('recipientEmail').isEmail().normalizeEmail(),
    body('amount').isFloat({ min: 0.01 }),
    body('description').notEmpty().trim().isLength({ max: 500 })
  ],
  sendMoney
);

// Get transactions with filters
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isIn([
      'all', 'deposit', 'withdrawal', 'send', 'received', 
      'exchange_from', 'exchange_to', 'request_sent', 
      'request_received', 'payment_sent', 'payment_received',
      'crypto_sent', 'crypto_received'
    ]),
    query('status').optional().isIn(['all', 'pending', 'completed', 'failed', 'cancelled', 'disputed']),
    query('wallet').optional().isString(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601()
  ],
  getTransactions
);

// Get single transaction
router.get('/:id',
  getTransaction
);

export default router;