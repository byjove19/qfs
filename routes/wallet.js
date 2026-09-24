const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { isAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all wallet routes
router.use(isAuthenticated);

// MAIN WALLET PAGE ROUTE - Shows EJS template
router.get('/', walletController.getWallets);

// API ROUTES (separate, can be called via AJAX)
router.get('/api/balances', walletController.getAllBalances);
router.get('/api/balance/:currency', walletController.getBalance);
router.get('/api/:currency', walletController.getWalletByCurrency);
router.post('/api/create', walletController.createWallet);
router.put('/api/update/:currency', walletController.updateBalance);
router.post('/api/transfer', walletController.transfer);
router.delete('/api/delete/:id', walletController.deleteWallet);

module.exports = router;