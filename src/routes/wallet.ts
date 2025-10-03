// src/routes/wallet.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { 
  getWallet, 
  updateWalletCurrency,
  getWalletPage  
} from '../controllers/walletController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);

// Page route (renders EJS template) - FIXED PATH
router.get('/wallet', getWalletPage);

// API routes - keep these separate
router.get('/api/wallet', getWallet);
router.put('/api/wallet/currency', 
  [
    body('currency').isLength({ min: 3, max: 3 }).isUppercase()
  ],
  updateWalletCurrency
);

export default router;