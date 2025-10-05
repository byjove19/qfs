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
          .select('firstName lastName email createdAt isActive balance currency'),
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
        user: currentUser,
        currentUser: currentUser,
        messages: {
          success: req.flash('success') || [],
          error: req.flash('error') || []
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      
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
        .select('firstName lastName email createdAt isActive balance currency loginHistory');

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
          .select('firstName lastName email balance currency createdAt isActive'),
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

  /** =======================
   *  UPDATED BALANCE MANAGEMENT (FOR USER DETAIL PAGE)
   *  =======================
   */
  async updateUserBalance(req, res) {
    try {
      const { userId, amount, type, reason } = req.body;
      
      // Validate required fields
      if (!userId || !amount || !type) {
        req.flash('error', 'Missing required fields');
        return res.redirect(`/admin/users/${userId}`);
      }

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
      }

      // Validate amount
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        req.flash('error', 'Invalid amount');
        return res.redirect(`/admin/users/${userId}`);
      }

      const oldBalance = user.balance || 0;
      let newBalance = oldBalance;
      let transactionType = '';
      let transactionDescription = '';

      // Process balance update based on type
      if (type === 'add') {
        newBalance = oldBalance + numericAmount;
        transactionType = 'admin_credit';
        transactionDescription = `Admin credit: ${reason || 'Funds added by administrator'}`;
      } else if (type === 'subtract') {
        if (oldBalance < numericAmount) {
          req.flash('error', 'Insufficient balance to deduct');
          return res.redirect(`/admin/users/${userId}`);
        }
        newBalance = oldBalance - numericAmount;
        transactionType = 'admin_debit';
        transactionDescription = `Admin debit: ${reason || 'Funds deducted by administrator'}`;
      } else {
        req.flash('error', 'Invalid operation type');
        return res.redirect(`/admin/users/${userId}`);
      }

      // Update user balance
      user.balance = newBalance;
      await user.save();

      // Create transaction record
      await Transaction.create({
        userId: user._id,
        type: transactionType,
        amount: numericAmount,
        currency: user.currency || 'USD',
        status: 'completed',
        description: transactionDescription,
        adminNote: `Processed by ${req.user.firstName} ${req.user.lastName}`,
        previousBalance: oldBalance,
        newBalance: newBalance,
        metadata: {
          adminId: req.user._id,
          operation: type,
          reason: reason || 'No reason provided'
        }
      });

      req.flash('success', 
        `Balance ${type === 'add' ? 'added to' : 'deducted from'} user account successfully. ` +
        `New balance: $${newBalance.toFixed(2)}`
      );
      
      // Redirect back to user detail page where the updated balance will show
      res.redirect(`/admin/users/${userId}`);
      
    } catch (error) {
      console.error('Update User Balance Error:', error);
      req.flash('error', 'Failed to update user balance');
      
      // Redirect back to user detail page or users list if userId is not available
      if (req.body.userId) {
        res.redirect(`/admin/users/${req.body.userId}`);
      } else {
        res.redirect('/admin/users');
      }
    }
  },

  async updateUserCurrency(req, res) {
    try {
      const { userId, currency } = req.body;
      
      if (!userId || !currency) {
        req.flash('error', 'Missing required fields');
        return res.redirect('/admin/users');
      }

      const user = await User.findById(userId);
      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
      }

      // Valid currencies
      const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
      if (!validCurrencies.includes(currency)) {
        req.flash('error', 'Invalid currency');
        return res.redirect(`/admin/users/${userId}`);
      }

      const oldCurrency = user.currency || 'USD';
      user.currency = currency;
      await user.save();

      // Create a system transaction for currency change
      await Transaction.create({
        userId: user._id,
        type: 'system',
        amount: 0,
        currency: currency,
        status: 'completed',
        description: `Currency changed from ${oldCurrency} to ${currency}`,
        adminNote: `Updated by ${req.user.firstName} ${req.user.lastName}`,
        metadata: {
          adminId: req.user._id,
          oldCurrency: oldCurrency,
          newCurrency: currency
        }
      });

      req.flash('success', `User currency updated to ${currency} successfully`);
      res.redirect(`/admin/users/${userId}`);
      
    } catch (error) {
      console.error('Update Currency Error:', error);
      req.flash('error', 'Failed to update currency');
      
      if (req.body.userId) {
        res.redirect(`/admin/users/${req.body.userId}`);
      } else {
        res.redirect('/admin/users');
      }
    }
  },

  async toggleUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      if (!userId) {
        req.flash('error', 'User ID is required');
        return res.redirect('/admin/users');
      }

      const user = await User.findById(userId);
      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
      }

      user.isActive = isActive === 'true';
      await user.save();

      // Create system transaction for status change
      await Transaction.create({
        userId: user._id,
        type: 'system',
        amount: 0,
        status: 'completed',
        description: `Account ${user.isActive ? 'activated' : 'deactivated'} by administrator`,
        adminNote: `Processed by ${req.user.firstName} ${req.user.lastName}`,
        metadata: {
          adminId: req.user._id,
          previousStatus: !user.isActive,
          newStatus: user.isActive
        }
      });

      req.flash('success', `User ${user.isActive ? 'activated' : 'deactivated'} successfully`);
      res.redirect(`/admin/users/${userId}`);
      
    } catch (error) {
      console.error('Toggle User Status Error:', error);
      req.flash('error', 'Failed to update user status');
      
      if (req.params.userId) {
        res.redirect(`/admin/users/${req.params.userId}`);
      } else {
        res.redirect('/admin/users');
      }
    }
  },

  /** =======================
   *  TRANSACTIONS MANAGEMENT
   *  =======================
   */
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
        transactions,
        totalTransactions,
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
      if (req.headers.referer && req.headers.referer.includes('pending-deposits')) return res.redirect('/admin/pending-deposits');
      if (req.headers.referer && req.headers.referer.includes('pending-withdrawals')) return res.redirect('/admin/pending-withdrawals');
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
  },

  /** =======================
   *  INVESTMENTS MANAGEMENT
   *  =======================
   */
  async getInvestments(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const { status } = req.query;

      const filter = {};
      if (status && status !== 'all') filter.status = status;

      const [investments, totalInvestments] = await Promise.all([
        Investment.find(filter)
          .populate('userId', 'firstName lastName email')
          .populate('planId')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Investment.countDocuments(filter)
      ]);

      // Calculate stats
      const totalActiveInvestments = await Investment.countDocuments({ status: 'active' });
      const totalCompletedInvestments = await Investment.countDocuments({ status: 'completed' });
      const totalInvestmentAmount = await Investment.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const totalAmount = totalInvestmentAmount.length > 0 ? totalInvestmentAmount[0].total : 0;

      res.render('admin/investments', {
        title: 'Investment Management',
        investments,
        totalInvestments,
        totalActiveInvestments,
        totalCompletedInvestments,
        totalAmount,
        currentPage: page,
        totalPages: Math.ceil(totalInvestments / limit),
        filter: { status },
        user: req.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get Investments Error:', error);
      req.flash('error', 'Failed to load investments');
      res.redirect('/admin/dashboard');
    }
  },

  async getInvestmentDetail(req, res) {
    try {
      const investment = await Investment.findById(req.params.id)
        .populate('userId', 'firstName lastName email')
        .populate('planId');

      if (!investment) {
        req.flash('error', 'Investment not found');
        return res.redirect('/admin/investments');
      }

      // Get investment returns/history
      const investmentReturns = await Transaction.find({
        investmentId: investment._id,
        type: 'investment_return'
      }).sort({ createdAt: -1 });

      res.render('admin/investment-detail', {
        title: `Investment Details - ${investment.userId.firstName}`,
        investment,
        investmentReturns,
        currentUser: req.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get Investment Detail Error:', error);
      req.flash('error', 'Failed to load investment details');
      res.redirect('/admin/investments');
    }
  },

  async updateInvestmentStatus(req, res) {
    try {
      const { investmentId, status, adminNote } = req.body;

      if (!investmentId || !status) {
        req.flash('error', 'Missing required fields');
        return res.redirect('/admin/investments');
      }

      const investment = await Investment.findById(investmentId).populate('userId');
      if (!investment) {
        req.flash('error', 'Investment not found');
        return res.redirect('/admin/investments');
      }

      const oldStatus = investment.status;
      investment.status = status;
      investment.adminNote = adminNote || `Updated by ${req.user.firstName}`;

      // If activating investment, ensure it's properly set up
      if (status === 'active' && oldStatus !== 'active') {
        investment.startDate = new Date();
        // Calculate end date based on plan duration
        if (investment.planId && investment.planId.duration) {
          investment.endDate = new Date(Date.now() + investment.planId.duration * 24 * 60 * 60 * 1000);
        }
      }

      // If completing investment, process returns
      if (status === 'completed' && oldStatus !== 'completed') {
        investment.endDate = new Date();
        // Here you would typically process final returns
      }

      await investment.save();

      req.flash('success', `Investment ${status} successfully.`);
      res.redirect('/admin/investments');
    } catch (error) {
      console.error('Update Investment Error:', error);
      req.flash('error', 'Failed to update investment');
      res.redirect('/admin/investments');
    }
  },

  async updateUserCurrency(req, res) {
  try {
    const { userId, currency } = req.body;
    
    if (!userId || !currency) {
      req.flash('error', 'Missing required fields');
      return res.redirect('back');
    }

    const user = await User.findById(userId);
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/users');
    }

    const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
    if (!validCurrencies.includes(currency)) {
      req.flash('error', 'Invalid currency');
      return res.redirect('back');
    }

    user.currency = currency;
    await user.save();

    req.flash('success', `Currency updated to ${currency} successfully`);
    res.redirect(`/admin/users/${userId}`);
  } catch (error) {
    console.error('Update Currency Error:', error);
    req.flash('error', 'Failed to update currency');
    res.redirect('back');
  }
},

};

module.exports = adminController;