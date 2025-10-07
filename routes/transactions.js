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
router.get('/money-transfer', isAuthenticated, transactionController.getSendMoney); // ADD THIS
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
router.post('/money-transfer', isAuthenticated, transactionController.sendMoney); // ADD THIS
router.post('/request-money', isAuthenticated, transactionController.requestMoney);
router.post('/request-card', isAuthenticated, transactionController.requestCard);
router.post('/exchange', isAuthenticated, transactionController.exchangeMoney);
router.post('/withdraw', isAuthenticated, transactionController.withdraw);

// ============================
// API & AJAX ROUTES
// ============================
router.get('/api/transactions', isAuthenticated, transactionController.getTransactionsAPI);
router.get('/filter', isAuthenticated, transactionController.filterTransactions);
router.get('/print/:id', isAuthenticated, transactionController.printTransaction);

// ============================
// ADMIN ROUTES
// ============================
router.post('/approve/:transactionId', isAuthenticated, isAdmin, transactionController.approveRequest);
router.post('/approve-send/:transactionId', isAuthenticated, isAdmin, transactionController.approveSendMoney);
router.post('/reject-send/:transactionId', isAuthenticated, isAdmin, transactionController.rejectSendMoney);

module.exports = router;