// src/routes/transaction.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { 
  sendMoney, 
  getTransactions, 
  getTransaction 
} from '../controllers/transactionController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);

router.post('/send',
  [
    body('recipientEmail').isEmail().normalizeEmail(),
    body('amount').isFloat({ min: 0.01 }),
    body('description').notEmpty().trim()
  ],
  sendMoney
);

router.get('/', getTransactions);
router.get('/:id', getTransaction);

export default router;