const express = require('express');
const router = express.Router();
const adminWalletController = require('../controllers/adminWalletController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// ===== ADMIN PAGE ROUTES =====
router.get('/wallet-addresses', isAuthenticated, isAdmin, adminWalletController.getWalletAddresses);

// ===== ADMIN API ROUTES =====
// These will be mounted under /admin/api/wallets
router.get('/api/wallets', isAuthenticated, isAdmin, adminWalletController.getWalletAddressesAPI);
router.put('/api/wallets/:currency', isAuthenticated, isAdmin, adminWalletController.updateWalletAddressAPI);
router.patch('/api/wallets/:currency/status', isAuthenticated, isAdmin, adminWalletController.toggleWalletStatusAPI);

// ===== PUBLIC API ROUTES =====
// These will be mounted under /api/wallet-addresses
router.get('/wallet-addresses/public', adminWalletController.getWalletAddressesPublic);

// Add the missing publish route
router.post('/api/wallets/publish', isAuthenticated, isAdmin, async (req, res) => {
    try {
        // This route just confirms the addresses are published
        res.json({
            success: true,
            message: 'Wallet addresses are now live on the frontend!'
        });
    } catch (error) {
        console.error('Error in publish route:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to publish addresses'
        });
    }
});

module.exports = router;