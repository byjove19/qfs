// src/routes/wallet.ts
import { Router } from 'express';
import { getWalletPage } from '../controllers/walletController';
import { webAuthenticate } from '../middlewares/authMiddleware'; // Use webAuthenticate for pages

const router = Router();

router.use(webAuthenticate); // This will redirect to login if not authenticated

router.get('/wallet', getWalletPage);

export default router;