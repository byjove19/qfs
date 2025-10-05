const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const transactionController = require('../controllers/transactionController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// ============================
// PAGE ROUTES
// ============================
router.get('/', isAuthenticated, transactionController.getTransactions);
router.get('/send', isAuthenticated, transactionController.getSendMoney);
router.get('/request-money', isAuthenticated, transactionController.getRequestMoney);
router.get('/request-card', isAuthenticated, transactionController.getRequestCard);
router.get('/exchange', isAuthenticated, transactionController.getExchangeMoney);
router.get('/withdraw', isAuthenticated, transactionController.getWithdraw);
router.get('/details/:id', isAuthenticated, transactionController.getTransactionDetails);

// 💸 NEW WITHDRAWAL PAGES
router.get('/withdrawal-list', isAuthenticated, transactionController.getWithdrawalList);
router.get('/withdrawal-settings', isAuthenticated, isAdmin, transactionController.getWithdrawalSettings);
router.get('/withdrawal-details/:id', isAuthenticated, transactionController.getWithdrawalDetails);

// ============================
// ACTION ROUTES
// ============================
router.post('/send', isAuthenticated, transactionController.sendMoney);
router.post('/request-money', isAuthenticated, transactionController.requestMoney);
router.post('/request-card', isAuthenticated, transactionController.requestCard);
router.post('/exchange', isAuthenticated, transactionController.exchangeMoney);
router.post('/withdraw', isAuthenticated, transactionController.withdraw);

// ============================
// ADMIN ROUTES
// ============================
router.post('/approve/:transactionId', isAuthenticated, isAdmin, transactionController.approveRequest);

module.exports = router;
