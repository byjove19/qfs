// src/routes/wallet.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { getWallet, updateWalletCurrency } from '../controllers/walletController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getWallet);
router.put('/currency', 
  [
    body('currency').isLength({ min: 3, max: 3 }).isUppercase()
  ],
  updateWalletCurrency
);

export default router;