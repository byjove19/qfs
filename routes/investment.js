// routes/investment.js
const express = require('express');
const router = express.Router();
const investmentController = require('../controllers/investmentController');
const { isAuthenticated, isAdmin, attachUser } = require('../middleware/auth');

// USER ROUTES - All require authentication
router.use(isAuthenticated);

// GET investment page (form)
router.get('/investment', investmentController.getInvestmentPage);

// GET investment list (history)
router.get('/investment-list', investmentController.getInvestmentList);

// POST create new investment
router.post('/investment', investmentController.createInvestment);

// GET single investment details
router.get('/investment/:id', investmentController.getInvestmentDetails);

// POST cancel investment
router.post('/investment/:id/cancel', investmentController.cancelInvestment);

// ADMIN ROUTES - Require admin privileges
router.get('/admin/investments', isAdmin, investmentController.adminGetAllInvestments);
router.post('/admin/investment/:id/approve', isAdmin, investmentController.approveInvestment);
router.post('/admin/investment/:id/reject', isAdmin, investmentController.rejectInvestment);

module.exports = router;