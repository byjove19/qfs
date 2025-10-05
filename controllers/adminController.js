// controllers/adminController.js

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Investment = require('../models/Investment');
const Ticket = require('../models/Ticket');

/**
 * Admin Controller
 * Handles all admin-related routes and operations
 */
const adminController = {

  /** =======================
   *  DASHBOARD CONTROLLER
   *  =======================
   */
  async getDashboard(req, res) {
    try {
      const dashboardData = {
        totalUsers: 0,
        totalTransactions: 0,
        pendingTransactions: 0,
        openTickets: 0,
        recentUsers: [],
        pendingDeposits: 0,
        pendingWithdrawals: 0,
        user: req.user || null
      };

      const [
        usersCount,
        transactionsCount,
        pendingTransactionsCount,
        openTicketsCount,
        recentUsersList,
        pendingDepositsCount,
        pendingWithdrawalsCount
      ] = await Promise.allSettled([
        User.countDocuments(),
        Transaction.countDocuments(),
        Transaction.countDocuments({ status: 'pending' }),
        Ticket.countDocuments({ status: 'open' }),
        User.find().sort({ createdAt: -1 }).limit(5).select('firstName lastName email createdAt isActive'),
        Transaction.countDocuments({ type: 'deposit', status: 'pending' }),
        Transaction.countDocuments({ type: 'withdrawal', status: 'pending' })
      ]);

      // Safe assign each
      const safeAssign = (result, key) => {
        if (result.status === 'fulfilled') dashboardData[key] = result.value;
      };
      safeAssign(usersCount, 'totalUsers');
      safeAssign(transactionsCount, 'totalTransactions');
      safeAssign(pendingTransactionsCount, 'pendingTransactions');
      safeAssign(openTicketsCount, 'openTickets');
      safeAssign(recentUsersList, 'recentUsers');
      safeAssign(pendingDepositsCount, 'pendingDeposits');
      safeAssign(pendingWithdrawalsCount, 'pendingWithdrawals');

      res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        ...dashboardData,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Admin Dashboard Error:', error);
      res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        totalUsers: 0,
        totalTransactions: 0,
        pendingTransactions: 0,
        openTickets: 0,
        recentUsers: [],
        pendingDeposits: 0,
        pendingWithdrawals: 0,
        user: req.user || null,
        messages: {
          error: 'Failed to load dashboard data.'
        }
      });
    }
  },

  /** =======================
   *  USERS MANAGEMENT
   *  =======================
   */
    async getUsers(req, res) {
    try {
      console.log('Loading users...');
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [users, totalUsers] = await Promise.all([
        User.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select('firstName lastName email createdAt isActive balance'),
        User.countDocuments()
      ]);

      // Ensure user data is properly passed
      const currentUser = req.user || {
        firstName: 'Admin',
        lastName: 'User', 
        role: 'admin'
      };

      res.render('admin/users', {
        title: 'Manage Users',
        users: users || [],
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers: totalUsers || 0,
        user: currentUser, // Make sure this is passed
        currentUser: currentUser, // Alternative name for safety
        messages: {
          success: req.flash('success') || [],
          error: req.flash('error') || []
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      
      // Provide fallback user data even on error
      const fallbackUser = {
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      };
      
      req.flash('error', 'Failed to load users');
      res.render('admin/users', {
        title: 'Manage Users',
        users: [],
        totalUsers: 0,
        user: fallbackUser,
        currentUser: fallbackUser,
        messages: {
          error: ['Failed to load users']
        }
      });
    }
  },

  async getUserDetail(req, res) {
    try {
      const user = await User.findById(req.params.id)
        .select('firstName lastName email createdAt isActive balance loginHistory');

      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
      }

      const recentTransactions = await Transaction.find({ userId: req.params.id })
        .sort({ createdAt: -1 }).limit(10);

      res.render('admin/user-detail', {
        title: `User Details - ${user.firstName} ${user.lastName}`,
        user,
        recentTransactions,
        currentUser: req.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get User Detail Error:', error);
      req.flash('error', 'Failed to load user details');
      res.redirect('/admin/users');
    }
  },

  async getUserLoginHistory(req, res) {
    try {
      const user = await User.findById(req.params.id).select('firstName lastName email loginHistory');
      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
      }

      res.render('admin/user-login-history', {
        title: `Login History - ${user.firstName} ${user.lastName}`,
        user,
        currentUser: req.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get Login History Error:', error);
      req.flash('error', 'Failed to load login history');
      res.redirect('/admin/users');
    }
  },

  /** =======================
   *  USER BALANCE MANAGEMENT
   *  =======================
   */
  async getAllUserBalances(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;
      const skip = (page - 1) * limit;

      const [users, totalUsers] = await Promise.all([
        User.find().sort({ balance: -1 }).skip(skip).limit(limit)
          .select('firstName lastName email balance createdAt isActive'),
        User.countDocuments()
      ]);

      const totalBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);

      res.render('admin/user-balances', {
        title: 'User Balances',
        users,
        totalBalance,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        user: req.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get Balances Error:', error);
      req.flash('error', 'Failed to load user balances');
      res.redirect('/admin/dashboard');
    }
  },

  async updateUserBalance(req, res) {
    try {
      const { userId, amount, type, reason } = req.body;
      if (!userId || !amount || !type) {
        req.flash('error', 'Missing required fields');
        return res.redirect('/admin/users/balances');
      }

      const user = await User.findById(userId);
      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users/balances');
      }

      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        req.flash('error', 'Invalid amount');
        return res.redirect('/admin/users/balances');
      }

      const oldBalance = user.balance;

      if (type === 'add') {
        user.balance += numericAmount;
      } else if (type === 'subtract') {
        if (user.balance < numericAmount) {
          req.flash('error', 'Insufficient balance');
          return res.redirect('/admin/users/balances');
        }
        user.balance -= numericAmount;
      } else {
        req.flash('error', 'Invalid operation type');
        return res.redirect('/admin/users/balances');
      }

      await user.save();

      await Transaction.create({
        userId: user._id,
        type: type === 'add' ? 'admin_credit' : 'admin_debit',
        amount: numericAmount,
        status: 'completed',
        description: reason || `Admin ${type === 'add' ? 'credit' : 'debit'}`,
        adminNote: `Processed by ${req.user.firstName} ${req.user.lastName}`,
        previousBalance: oldBalance,
        newBalance: user.balance
      });

      req.flash('success', `Balance updated successfully. New balance: $${user.balance.toFixed(2)}`);
      res.redirect('/admin/users/balances');
    } catch (error) {
      console.error('Update Balance Error:', error);
      req.flash('error', 'Failed to update user balance');
      res.redirect('/admin/users/balances');
    }
  },

  /** =======================
   *  TRANSACTIONS MANAGEMENT
   *  =======================
   */
  // GET /admin/transactions

getTransactions: async (req, res) => {  // ✅ correct inside object

  try {
    // Check that user exists in session
    if (!req.session.user) {
      req.flash('error', 'You must be logged in as admin');
      return res.redirect('/auth/login');
    }

    // Example data for table (replace with actual query)
    const users = await User.find({}, 'firstName lastName email balance isActive createdAt');

    // Calculate total balance (optional)
    const totalBalance = users.reduce((sum, user) => sum + (user.balance || 0), 0);

    // Render EJS with user info
    res.render('admin/transactions', {
      title: 'User Transactions - Admin',
      user: req.session.user,  // ✅ Ensure `user` is passed
      users,
      totalBalance,
      messages: {
        error: req.flash('error'),
        success: req.flash('success')
      }
    });
  } catch (error) {
    console.error('Error loading transactions page:', error);
    res.status(500).render('500', { title: 'Server Error - QFS' });
  }
},

  async updateTransactionStatus(req, res) {
    try {
      const { transactionId, status, adminNote } = req.body;

      if (!transactionId || !status) {
        req.flash('error', 'Missing required fields');
        return res.redirect('/admin/transactions');
      }

      const transaction = await Transaction.findById(transactionId).populate('userId');
      if (!transaction) {
        req.flash('error', 'Transaction not found');
        return res.redirect('/admin/transactions');
      }

      transaction.status = status;
      transaction.adminNote = adminNote || `Updated by ${req.user.firstName}`;
      transaction.processedAt = new Date();

      // Deposit Approval
      if (status === 'completed' && transaction.type === 'deposit') {
        const user = await User.findById(transaction.userId);
        user.balance += transaction.amount;
        await user.save();
      }

      // Withdrawal Rejection Refund
      if (status === 'rejected' && transaction.type === 'withdrawal') {
        const user = await User.findById(transaction.userId);
        user.balance += transaction.amount;
        await user.save();
      }

      await transaction.save();

      req.flash('success', `Transaction ${status} successfully.`);
      if (req.headers.referer.includes('pending-deposits')) return res.redirect('/admin/pending-deposits');
      if (req.headers.referer.includes('pending-withdrawals')) return res.redirect('/admin/pending-withdrawals');
      res.redirect('/admin/transactions');
    } catch (error) {
      console.error('Update Transaction Error:', error);
      req.flash('error', 'Failed to update transaction');
      res.redirect('/admin/transactions');
    }
  },

  /** =======================
   *  SUPPORT TICKETS MANAGEMENT
   *  =======================
   */
  async getTickets(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;
      const skip = (page - 1) * limit;
      const { status } = req.query;

      const filter = {};
      if (status && status !== 'all') filter.status = status;

      const [tickets, totalTickets] = await Promise.all([
        Ticket.find(filter)
          .populate('userId', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Ticket.countDocuments(filter)
      ]);

      res.render('admin/tickets', {
        title: 'Support Tickets',
        tickets,
        totalTickets,
        currentPage: page,
        totalPages: Math.ceil(totalTickets / limit),
        filter: { status },
        user: req.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get Tickets Error:', error);
      req.flash('error', 'Failed to load tickets');
      res.redirect('/admin/dashboard');
    }
  }
,

  getTransactions: async (req, res) => {
  try {
    if (!req.session.user) {
      req.flash('error', 'You must be logged in as admin');
      return res.redirect('/auth/login');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get transactions with pagination
    const [transactions, totalTransactions] = await Promise.all([
      Transaction.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email')
        .populate('recipientId', 'firstName lastName email')
        .lean(),
      Transaction.countDocuments()
    ]);

    res.render('admin/transactions', {
      title: 'All Transactions - Admin',
      user: req.session.user,
      transactions, // Pass actual transactions to template
      totalTransactions, // ✅ This fixes the error
      currentPage: page,
      totalPages: Math.ceil(totalTransactions / limit),
      messages: {
        error: req.flash('error'),
        success: req.flash('success')
      }
    });
  } catch (error) {
    console.error('Error loading transactions page:', error);
    res.status(500).render('500', { 
      title: 'Server Error - QFS',
      user: req.session.user 
    });
  }
},
};



module.exports = adminController;
