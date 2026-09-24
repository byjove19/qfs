// routes/deposit.js
const express = require('express');
const router = express.Router();
const depositController = require('../controllers/depositController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { uploadDeposit } = require('../config/multer');

// Deposit routes
router.get('/deposit', isAuthenticated, depositController.getDepositPage);
router.post('/deposit/process', isAuthenticated, uploadDeposit, depositController.processDeposit);
router.get('/deposit/history', isAuthenticated, depositController.getDepositHistory);
router.get('/deposit/details/:id', isAuthenticated, depositController.getDepositDetails);

// NEW ROUTE: Handle crypto deposit submissions from the new UI
router.post('/deposit/submit', isAuthenticated, depositController.submitDepositRequest);

module.exports = router;