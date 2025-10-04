const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { isAuthenticated } = require('../middleware/auth'); 
const { body } = require('express-validator');

// Apply authentication middleware to all routes
router.use(isAuthenticated); // CHANGED FROM ensureAuthenticated

// Validation rules
const sendMoneyValidation = [
  body('recipientEmail').isEmail().normalizeEmail().withMessage('Valid recipient email is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('currency').isIn(['USD', 'BTC', 'ETH', 'XRP', 'DOGE']).withMessage('Valid currency is required'),
  body('description').optional().trim().escape()
];

const withdrawValidation = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('currency').isIn(['USD', 'BTC', 'ETH', 'XRP', 'DOGE']).withMessage('Valid currency is required'),
  body('method').isIn(['bank', 'crypto']).withMessage('Valid withdrawal method is required')
];

// Routes
router.get('/', transactionController.getTransactions);
router.get('/send', transactionController.getSendMoney);
router.post('/send', sendMoneyValidation, transactionController.sendMoney);
router.get('/withdraw', transactionController.getWithdraw);
router.post('/withdraw', withdrawValidation, transactionController.withdraw);

module.exports = router;