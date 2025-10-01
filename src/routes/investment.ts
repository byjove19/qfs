// src/routes/investment.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { 
  getInvestmentPlans,
  createInvestment,
  getInvestments,
  getInvestment,
  cancelInvestment
} from '../controllers/investmentController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/plans', getInvestmentPlans);
router.post('/',
  [
    body('plan').isIn(['basic', 'premium', 'vip']),
    body('amount').isFloat({ min: 0.01 })
  ],
  createInvestment
);
router.get('/', getInvestments);
router.get('/:id', getInvestment);
router.post('/:id/cancel', cancelInvestment);

export default router;