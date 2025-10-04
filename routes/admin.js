const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin, attachUser } = require('../middleware/auth');

router.use(attachUser);
router.use(isAuthenticated);
router.use(isAdmin);

router.get('/admin/dashboard', adminController.getDashboard);
router.get('/admin/users', adminController.getUsers);
router.get('/admin/users/:id', adminController.getUserDetail);
router.post('/admin/users/update-balance', adminController.updateUserBalance);
router.get('/admin/transactions', adminController.getTransactions);
router.post('/admin/transactions/update-status', adminController.updateTransactionStatus);

module.exports = router;