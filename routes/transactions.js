const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const transactionController = require('../controllers/transactionController');
const { isAuthenticated } = require('../middleware/auth');

// Page routes
router.get('/', isAuthenticated, transactionController.getTransactions);
router.get('/send', isAuthenticated, transactionController.getSendMoney);
router.get('/withdraw', isAuthenticated, transactionController.getWithdraw);

// API route for AJAX calls - WITH BETTER ERROR HANDLING
router.get('/api/transactions', async (req, res) => {
  try {
    console.log('=== TRANSACTIONS API CALL ===');
    console.log('Session ID:', req.sessionID);
    console.log('Session user:', req.session.user);
    console.log('Cookies:', req.headers.cookie);
    
    // Check authentication WITHOUT middleware redirect
    if (!req.session || !req.session.user) {
      console.log('❌ No session or user - returning 401');
      return res.status(401).json({ 
        success: false, 
        message: 'Your session has expired. Please refresh the page.',
        code: 'SESSION_EXPIRED'
      });
    }

    const userId = req.session.user._id;
    console.log('✅ Authenticated user:', userId);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filters = { $or: [{ userId }, { recipientId: userId }] };

    if (req.query.type && req.query.type !== 'all') filters.type = req.query.type;
    if (req.query.status && req.query.status !== 'all') filters.status = req.query.status;

    const [transactions, total] = await Promise.all([
      Transaction.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email')
        .populate('recipientId', 'firstName lastName email')
        .lean(), // Use lean() for better performance
      Transaction.countDocuments(filters)
    ]);

    console.log(`✅ Found ${transactions.length} transactions`);

    const formattedTransactions = transactions.map(transaction => ({
      _id: transaction._id,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      description: transaction.description || '',
      createdAt: transaction.createdAt,
      formattedDate: new Date(transaction.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      icon: `/images/transactions/${transaction.type}.svg`,
      isPositive: transaction.type === 'deposit' || transaction.type === 'receive',
      displayAmount: `${transaction.currency} ${transaction.amount.toLocaleString()}`,
      statusText: transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1),
      statusClass: transaction.status === 'completed' ? 'text-success' : 
                   transaction.status === 'pending' ? 'text-warning' : 'text-danger'
    }));

    res.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          current: page,
          hasMore: page < Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ API Error fetching transactions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error loading transactions',
      code: 'SERVER_ERROR'
    });
  }
});

// Action routes
router.post('/send', isAuthenticated, transactionController.sendMoney);
router.post('/withdraw', isAuthenticated, transactionController.withdraw);

module.exports = router;