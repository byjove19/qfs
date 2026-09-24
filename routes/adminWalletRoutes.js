const express = require('express');
const router = express.Router();
const adminWalletController = require('../controllers/adminWalletController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// ===== ADMIN PAGE ROUTES =====
// Accessible at /admin/wallet-addresses
router.get('/wallet-addresses', isAuthenticated, isAdmin, adminWalletController.getWalletAddresses);

// ===== ADMIN API ROUTES =====
// When mounted at /api/admin in app.js, these become:
// GET    /api/admin/wallets/
// PUT    /api/admin/wallets/:currency
// PATCH  /api/admin/wallets/:currency/status
// POST   /api/admin/wallets/publish
router.get('/wallets/', isAuthenticated, isAdmin, adminWalletController.getWalletAddressesAPI);
router.put('/wallets/:currency', isAuthenticated, isAdmin, adminWalletController.updateWalletAddressAPI);
router.patch('/wallets/:currency/status', isAuthenticated, isAdmin, adminWalletController.toggleWalletStatusAPI);

// Publish route
router.post('/wallets/publish', isAuthenticated, isAdmin, async (req, res) => {
    try {
        // This route confirms the addresses are published
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

// ===== PUBLIC API ROUTES =====
// When mounted at /api in app.js, this becomes:
// GET /api/wallet-addresses/public
router.get('/wallet-addresses/public', adminWalletController.getWalletAddressesPublic);

module.exports = router;