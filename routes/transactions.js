const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const transactionController = require('../controllers/transactionController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// PAGE ROUTES
router.get('/', isAuthenticated, transactionController.getTransactions);
router.get('/send', isAuthenticated, transactionController.getSendMoney);
router.get('/request-money', isAuthenticated, transactionController.getRequestMoney);
router.get('/request-card', isAuthenticated, transactionController.getRequestCard);
router.get('/exchange', isAuthenticated, transactionController.getExchangeMoney);
router.get('/withdraw', isAuthenticated, transactionController.getWithdraw);
router.get('/details/:id', isAuthenticated, transactionController.getTransactionDetails);

// API ROUTE FOR AJAX CALLS
router.get('/api/transactions', async (req, res) => {
  try {
    console.log('=== TRANSACTIONS API CALL ===');
    console.log('Session ID:', req.sessionID);
    console.log('Session user:', req.session.user);
    
    if (!req.session || !req.session.user) {
      console.log('❌ No session or user - returning 401');
      return res.status(401).json({ 
        success: false, 
        message: 'Your session has expired. Please refresh the page.',
        code: 'SESSION_EXPIRED'
      });
    }

    const userId = req.session.user._id;
    const userRole = req.session.user.role;
    console.log('✅ Authenticated user:', userId, 'Role:', userRole);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query based on user role
    let filters = {};
    
    if (['admin', 'superadmin'].includes(userRole)) {
      filters = {};
    } else {
      filters = {
        $or: [
          { userId }, 
          { recipientId: userId },
          { 
            $and: [
              { $or: [{ userId }, { recipientId: userId }] },
              { status: { $in: ['completed', 'approved'] } }
            ]
          },
          {
            $and: [
              { $or: [{ userId }, { recipientId: userId }] },
              { type: { $in: ['admin_credit', 'admin_debit', 'system'] } }
            ]
          }
        ]
      };
    }

    if (req.query.type && req.query.type !== 'all') filters.type = req.query.type;
    if (req.query.status && req.query.status !== 'all') filters.status = req.query.status;

    const [transactions, total] = await Promise.all([
      Transaction.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email role')
        .populate('recipientId', 'firstName lastName email role')
        .lean(),
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
      isPositive: transaction.type === 'deposit' || transaction.type === 'receive' || transaction.type === 'admin_credit',
      displayAmount: `${transaction.currency} ${transaction.amount.toLocaleString()}`,
      statusText: transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1),
      statusClass: transaction.status === 'completed' ? 'text-success' : 
                   transaction.status === 'pending' ? 'text-warning' : 'text-danger',
      isAdminTransaction: ['admin_credit', 'admin_debit', 'system'].includes(transaction.type),
      initiatedBy: transaction.userId?.role === 'admin' || transaction.userId?.role === 'superadmin' ? 'Admin' : 'User'
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
        },
        userRole: userRole
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

// ACTION ROUTES
router.post('/send', isAuthenticated, transactionController.sendMoney);
router.post('/request-money', isAuthenticated, transactionController.requestMoney);
router.post('/request-card', isAuthenticated, transactionController.requestCard);
router.post('/exchange', isAuthenticated, transactionController.exchangeMoney);
router.post('/withdraw', isAuthenticated, transactionController.withdraw);

// ADMIN ROUTES
router.post('/approve/:transactionId', isAuthenticated, isAdmin, transactionController.approveRequest);

module.exports = router;