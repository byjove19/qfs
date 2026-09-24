const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const transactionController = require('../controllers/transactionController');
const { isAuthenticated, attachUser } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(attachUser);
router.use(isAuthenticated);

// Dashboard routes
router.get('/dashboard', dashboardController.getDashboard);
router.get('/profile', dashboardController.getProfile);
router.post('/profile', upload.single('profilePicture'), dashboardController.updateProfile);

// Transaction routes
router.get('/transactions', transactionController.getTransactions);
router.get('/transactions/send', transactionController.getSendMoney);
router.post('/transactions/send', [
  require('express-validator').body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required'),
  require('express-validator').body('recipientEmail').isEmail().withMessage('Valid recipient email required')
], transactionController.sendMoney);
router.get('/transactions/withdraw', transactionController.getWithdraw);
router.post('/transactions/withdraw', [
  require('express-validator').body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required')
], transactionController.withdraw);

module.exports = router;