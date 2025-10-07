const express = require('express');
const router = express.Router();
const adminWalletController = require('../controllers/adminWalletController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Admin page routes
router.get('/wallet-addresses', isAuthenticated, isAdmin, adminWalletController.getWalletAddresses);

// Admin API routes
router.get('/api/wallets', isAuthenticated, isAdmin, adminWalletController.getWalletAddressesAPI);
router.put('/api/wallets/:currency', isAuthenticated, isAdmin, adminWalletController.updateWalletAddressAPI);

// Public API routes (for frontend deposit page)
router.get('/api/wallet-addresses', adminWalletController.getWalletAddressesPublic);

module.exports = router;