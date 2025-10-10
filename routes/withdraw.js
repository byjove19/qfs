// routes/admin.js

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Withdrawal Management
router.get('/withdrawal-requests', isAuthenticated, isAdmin, adminController.getWithdrawalRequests);
router.post('/withdrawal-requests/:id/approve', isAuthenticated, isAdmin, adminController.approveWithdrawal);
router.post('/withdrawal-requests/:id/reject', isAuthenticated, isAdmin, adminController.rejectWithdrawal);

// Deposit Management
router.get('/pending-deposits', isAuthenticated, isAdmin, adminController.getPendingDeposits);
router.post('/deposits/:id/approve', isAuthenticated, isAdmin, adminController.approveDeposit);
router.post('/deposits/:id/reject', isAuthenticated, isAdmin, adminController.rejectDeposit);

module.exports = router;