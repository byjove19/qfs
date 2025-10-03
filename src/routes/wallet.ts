// src/routes/wallet.ts
import { Router } from 'express';
import { getWalletPage } from '../controllers/walletController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);

// This will render the wallet list page with dynamic data
router.get('/wallet', getWalletPage);

export default router;