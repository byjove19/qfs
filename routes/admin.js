// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin, isAuthenticated, attachUser } = require('../middleware/auth');

router.use(attachUser); 
router.use(isAuthenticated); 
router.use(isAdmin); 

// Dashboard routes
router.get('/', adminController.getDashboard);
router.get('/dashboard', adminController.getDashboard);

// User management routes
router.get('/users', adminController.getUsers);
router.get('/users/balances', adminController.getAllUserBalances);
router.get('/users/:id', adminController.getUserDetail);
router.get('/users/:id/login-history', adminController.getUserLoginHistory);
router.post('/users/update-balance', adminController.updateUserBalance);
router.put('/users/:userId/status', adminController.toggleUserStatus);
router.post('/users/update-currency', adminController.updateUserCurrency);

// NEW: User wallet management routes
router.get('/user-wallets', adminController.getAllUserWallets);
router.get('/user-wallets/:userId', adminController.getUserWallets);
router.post('/user-wallets/update', adminController.updateUserWallet);

// Transaction management routes
router.get('/transactions', adminController.getTransactions);
router.post('/transactions/update-status', adminController.updateTransactionStatus);

// Deposit address management routes
router.get('/deposit-addresses', adminController.getDepositAddresses);
router.post('/deposit-addresses/update', adminController.updateDepositAddress);
router.get('/deposit-addresses/:currency', adminController.getDepositAddress);

// Pending transactions routes
router.get('/pending-deposits', adminController.getPendingDeposits);
router.post('/pending-deposits/process', adminController.processDeposit);
router.get('/pending-withdrawals', adminController.getPendingWithdrawals);
router.post('/pending-withdrawals/process', adminController.processWithdrawal);
router.get('/pending-transfers', adminController.getPendingTransfers);
router.post('/pending-transfers/process', adminController.processTransfer);

// Money operations routes
router.post('/transfer-between-users', adminController.transferBetweenUsers);
router.post('/request-money', adminController.requestMoneyFromUser);
router.post('/exchange-money', adminController.exchangeMoney);
router.post('/admin-withdrawal', adminController.adminWithdrawal);

// Ticket management routes
router.get('/tickets', adminController.getTickets);

// Investment management routes
router.get('/investments', adminController.getInvestments);
router.get('/investments/:id', adminController.getInvestmentDetail);
router.post('/investments/update-status', adminController.updateInvestmentStatus);

module.exports = router;