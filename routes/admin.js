// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin, isAuthenticated } = require('../middleware/auth');

// Apply admin middleware to all routes
router.use(isAuthenticated, isAdmin);

// Dashboard routes
router.get('/', adminController.getDashboard);
router.get('/dashboard', adminController.getDashboard);

// User management routes
router.get('/users', adminController.getUsers);
router.get('/users/balances', adminController.getAllUserBalances);
router.get('/users/:id', adminController.getUserDetail);
router.get('/users/:id/login-history', adminController.getUserLoginHistory);
router.post('/users/update-balance', adminController.updateUserBalance);
// Add this route with your other user management routes
router.put('/users/:userId/status', adminController.toggleUserStatus);

// Transaction management routes
router.get('/transactions', adminController.getTransactions);
router.get('/pending-deposits', adminController.getTransactions);
router.get('/pending-withdrawals', adminController.getTransactions);
router.post('/transactions/update-status', adminController.updateTransactionStatus);

// Ticket management routes
router.get('/tickets', adminController.getTickets);

// Placeholder routes for future implementation
router.post('/users/bulk-update-balances', (req, res) => {
  req.flash('info', 'Bulk update feature coming soon');
  res.redirect('/admin/users/balances');
});

router.get('/investments', (req, res) => {
  req.flash('info', 'Investment management coming soon');
  res.redirect('/admin/dashboard');
});

router.post('/investments/update-status', (req, res) => {
  req.flash('info', 'Investment management coming soon');
  res.redirect('/admin/dashboard');
});

router.get('/tickets/:id', (req, res) => {
  req.flash('info', 'Ticket details coming soon');
  res.redirect('/admin/tickets');
});

router.post('/tickets/update-status', (req, res) => {
  req.flash('info', 'Ticket status update coming soon');
  res.redirect('/admin/tickets');
});

router.post('/tickets/add-message', (req, res) => {
  req.flash('info', 'Ticket messaging coming soon');
  res.redirect('/admin/tickets');
});

router.post('/process-exchange', (req, res) => {
  req.flash('info', 'Exchange processing coming soon');
  res.redirect('/admin/transactions');
});

// Add this route with your other user management routes
router.post('/users/update-currency', adminController.updateUserCurrency);

module.exports = router;