// controllers/adminController.js

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Investment = require('../models/Investment');
const Ticket = require('../models/Ticket');
const Wallet = require('../models/Wallet');
const CardRequest = require('../models/CardRequest');
const mongoose = require('mongoose');
const TrustWallet = require('../models/TrustWalletUser');

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
        user: req.session.user || null
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
        user: req.session.user || null,
        messages: { error: 'Failed to load dashboard data.' }
      });
    }
  },

  /** =======================
   *  USERS MANAGEMENT
   *  =======================
   */

  async getUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const users = await User.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('firstName lastName email createdAt isActive currency');

      const usersWithBalances = await Promise.all(
        users.map(async (user) => {
          const wallet = await Wallet.findOne({ userId: user._id, currency: 'USD' });
          return {
            ...user.toObject(),
            balance: wallet ? wallet.balance : 0
          };
        })
      );

      const totalUsers = await User.countDocuments();

      const currentUser = req.session.user || {
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      };

      res.render('admin/users', {
        title: 'Manage Users',
        users: usersWithBalances || [],
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers: totalUsers || 0,
        limit: limit,
        user: currentUser,
        currentUser: currentUser,
        messages: {
          success: req.flash('success') || [],
          error: req.flash('error') || []
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      const fallbackUser = { firstName: 'Admin', lastName: 'User', role: 'admin' };
      req.flash('error', 'Failed to load users');
      res.render('admin/users', {
        title: 'Manage Users',
        users: [],
        totalUsers: 0,
        limit: 10,
        user: fallbackUser,
        currentUser: fallbackUser,
        messages: { error: ['Failed to load users'] }
      });
    }
  },

  // ✅ Search users — NO isActive filter, finds everyone in DB
  async searchUsers(req, res) {
    try {
      const q = (req.query.q || '').trim();
      if (q.length < 2) {
        return res.json({ success: true, users: [] });
      }

      const regex = new RegExp(q, 'i');
      const users = await User.find({
        $or: [
          { email: regex },
          { firstName: regex },
          { lastName: regex }
        ]
      })
        .select('_id firstName lastName email')
        .limit(20)
        .lean();

      res.json({ success: true, users });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ success: false, message: 'Search failed' });
    }
  },

  // ✅ Get all users — NO isActive filter
  async getAllUsersMinimal(req, res) {
    try {
      const users = await User.find()
        .select('_id firstName lastName email')
        .lean();
      res.json({ success: true, users });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ success: false, message: 'Failed to load users' });
    }
  },

  async getUserDetail(req, res) {
    try {
      const user = await User.findById(req.params.id)
        .select('firstName lastName email createdAt isActive currency loginHistory');

      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
      }

      const wallets = await Wallet.find({ userId: req.params.id });

      const currencyBalances = {};
      let totalBalanceUSD = 0;
      let totalDepositsUSD = 0;
      let totalWithdrawalsUSD = 0;

      wallets.forEach(wallet => {
        currencyBalances[wallet.currency] = { amount: wallet.balance, usdValue: 0 };
      });

      const exchangeRates = {
        'USD': 1.00, 'EUR': 0.92, 'GBP': 0.79, 'CAD': 1.36, 'AUD': 1.52, 'JPY': 149.50,
        'BTC': 50000, 'ETH': 3000, 'XRP': 0.5, 'STRAWMAN': 0.1, 'LTC': 70, 'ALGO': 0.2,
        'XDC': 0.05, 'XLM': 0.1, 'MATIC': 0.8
      };

      Object.keys(currencyBalances).forEach(currency => {
        const rate = exchangeRates[currency] || 1;
        currencyBalances[currency].usdValue = currencyBalances[currency].amount * rate;
        totalBalanceUSD += currencyBalances[currency].usdValue;
      });

      const recentTransactions = await Transaction.find({ userId: req.params.id })
        .sort({ createdAt: -1 }).limit(10);

      const depositTransactions = await Transaction.find({
        userId: req.params.id, type: 'deposit', status: 'completed'
      });

      const withdrawalTransactions = await Transaction.find({
        userId: req.params.id, type: 'withdrawal', status: 'completed'
      });

      depositTransactions.forEach(t => {
        const rate = exchangeRates[t.currency] || 1;
        totalDepositsUSD += t.amount * rate;
      });

      withdrawalTransactions.forEach(t => {
        const rate = exchangeRates[t.currency] || 1;
        totalWithdrawalsUSD += t.amount * rate;
      });

      const recentTransactionsWithUSD = recentTransactions.map(t => {
        const rate = exchangeRates[t.currency] || 1;
        return { ...t.toObject(), usdValue: t.amount * rate };
      });

      const userWithFinancialData = {
        ...user.toObject(),
        totalBalanceUSD,
        totalDepositsUSD,
        totalWithdrawalsUSD
      };

      res.render('admin/user-detail', {
        title: `User Details - ${user.firstName} ${user.lastName}`,
        user: userWithFinancialData,
        currencyBalances,
        recentTransactions: recentTransactionsWithUSD,
        currentUser: req.session.user,
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
        currentUser: req.session.user,
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

      const users = await User.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('firstName lastName email currency createdAt isActive');

      const usersWithBalances = await Promise.all(
        users.map(async (user) => {
          const wallets = await Wallet.find({ userId: user._id });
          const balances = {};
          let totalBalanceUSD = 0;

          wallets.forEach(wallet => {
            balances[wallet.currency] = wallet.balance;
            if (wallet.currency === 'USD') totalBalanceUSD += wallet.balance;
          });

          return { ...user.toObject(), balances, totalBalance: totalBalanceUSD };
        })
      );

      const totalUsers = await User.countDocuments();
      const totalBalance = usersWithBalances.reduce((sum, u) => sum + (u.totalBalance || 0), 0);

      res.render('admin/user-balances', {
        title: 'User Balances',
        users: usersWithBalances,
        totalBalance,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        user: req.session.user,
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
      const { userId, amount, type, reason, currency } = req.body;

      if (!userId || !amount || !type || !currency) {
        req.flash('error', 'Missing required fields');
        return res.redirect(`/admin/users/${userId}`);
      }

      const user = await User.findById(userId);
      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
      }

      let wallet = await Wallet.findOne({ userId: userId, currency: currency });
      if (!wallet) {
        try {
          wallet = new Wallet({ userId: userId, currency: currency, balance: 0 });
          await wallet.save();
        } catch (createError) {
          if (createError.code === 11000) {
            wallet = await Wallet.findOne({ userId: userId, currency: currency });
            if (!wallet) {
              req.flash('error', 'Failed to create wallet. Please try again.');
              return res.redirect(`/admin/users/${userId}`);
            }
          } else {
            throw createError;
          }
        }
      }

      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        req.flash('error', 'Invalid amount');
        return res.redirect(`/admin/users/${userId}`);
      }

      const oldBalance = wallet.balance || 0;
      let newBalance = oldBalance;
      let transactionType = '';
      let transactionDescription = '';

      if (type === 'add') {
        newBalance = oldBalance + numericAmount;
        transactionType = 'deposit';
        transactionDescription = `Admin credit: ${reason || 'Funds added by administrator'}`;
      } else if (type === 'subtract') {
        if (oldBalance < numericAmount) {
          req.flash('error', 'Insufficient balance to deduct');
          return res.redirect(`/admin/users/${userId}`);
        }
        newBalance = oldBalance - numericAmount;
        transactionType = 'withdrawal';
        transactionDescription = `Admin debit: ${reason || 'Funds deducted by administrator'}`;
      } else {
        req.flash('error', 'Invalid operation type');
        return res.redirect(`/admin/users/${userId}`);
      }

      wallet.balance = newBalance;
      wallet.lastAction = new Date();
      await wallet.save();

      await Transaction.create({
        userId: user._id,
        walletId: wallet._id,
        type: transactionType,
        method: 'manual',
        amount: numericAmount,
        currency: currency,
        status: 'completed',
        description: transactionDescription,
        metadata: {
          adminId: req.session.user._id,
          operation: type,
          reason: reason || 'No reason provided',
          adminProcessed: true,
          previousBalance: oldBalance,
          newBalance: newBalance
        }
      });

      req.flash('success',
        `Balance ${type === 'add' ? 'added to' : 'deducted from'} user account successfully. ` +
        `New ${currency} balance: ${newBalance.toFixed(2)}`
      );

      res.redirect(`/admin/users/${userId}`);
    } catch (error) {
      console.error('Update User Balance Error:', error);
      req.flash('error', 'Failed to update user balance: ' + error.message);
      if (req.body.userId) res.redirect(`/admin/users/${req.body.userId}`);
      else res.redirect('/admin/users');
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

      const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
      if (!validCurrencies.includes(currency)) {
        req.flash('error', 'Invalid currency');
        return res.redirect(`/admin/users/${userId}`);
      }

      const oldCurrency = user.currency || 'USD';
      user.currency = currency;
      await user.save();

      await Transaction.create({
        userId: user._id,
        type: 'system',
        amount: 0,
        currency: currency,
        status: 'completed',
        description: `Currency changed from ${oldCurrency} to ${currency}`,
        adminNote: `Updated by ${req.session.user.firstName} ${req.session.user.lastName}`,
        metadata: {
          adminId: req.session.user._id,
          oldCurrency: oldCurrency,
          newCurrency: currency
        }
      });

      req.flash('success', `User currency updated to ${currency} successfully`);
      res.redirect(`/admin/users/${userId}`);
    } catch (error) {
      console.error('Update Currency Error:', error);
      req.flash('error', 'Failed to update currency');
      if (req.body.userId) res.redirect(`/admin/users/${req.body.userId}`);
      else res.redirect('/admin/users');
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

      await Transaction.create({
        userId: user._id,
        type: 'system',
        amount: 0,
        status: 'completed',
        description: `Account ${user.isActive ? 'activated' : 'deactivated'} by administrator`,
        adminNote: `Processed by ${req.session.user.firstName} ${req.session.user.lastName}`,
        metadata: {
          adminId: req.session.user._id,
          previousStatus: !user.isActive,
          newStatus: user.isActive
        }
      });

      req.flash('success', `User ${user.isActive ? 'activated' : 'deactivated'} successfully`);
      res.redirect(`/admin/users/${userId}`);
    } catch (error) {
      console.error('Toggle User Status Error:', error);
      req.flash('error', 'Failed to update user status');
      if (req.params.userId) res.redirect(`/admin/users/${req.params.userId}`);
      else res.redirect('/admin/users');
    }
  },

  /** =======================
   *  TRANSACTIONS MANAGEMENT
   *  =======================
   */
  async getTransactions(req, res) {
    try {
      if (!req.session.user) {
        req.flash('error', 'You must be logged in as admin');
        return res.redirect('/auth/login');
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [transactions, totalTransactions, completedTransactions, pendingTransactions, failedTransactions] = await Promise.all([
        Transaction.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'firstName lastName email')
          .populate('recipientId', 'firstName lastName email')
          .lean(),
        Transaction.countDocuments(),
        Transaction.countDocuments({ status: 'completed' }),
        Transaction.countDocuments({ status: 'pending' }),
        Transaction.countDocuments({ status: 'failed' })
      ]);

      const totalAmountResult = await Transaction.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;

      res.render('admin/transactions', {
        title: 'All Transactions - Admin',
        user: req.session.user,
        transactions,
        totalTransactions,
        completedTransactions: completedTransactions || 0,
        pendingTransactions: pendingTransactions || 0,
        failedTransactions: failedTransactions || 0,
        totalAmount: totalAmount || 0,
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
      transaction.adminNote = adminNote || `Updated by ${req.session.user.firstName}`;
      transaction.processedAt = new Date();

      if (status === 'completed' && transaction.type === 'deposit') {
        const user = await User.findById(transaction.userId);
        if (user) {
          let wallet = await Wallet.findOne({ userId: user._id, currency: 'USD' });
          if (!wallet) wallet = new Wallet({ userId: user._id, currency: 'USD', balance: 0 });
          wallet.balance += transaction.amount;
          wallet.lastAction = new Date();
          await wallet.save();
        }
      }

      if (status === 'rejected' && transaction.type === 'withdrawal') {
        const user = await User.findById(transaction.userId);
        if (user) {
          let wallet = await Wallet.findOne({ userId: user._id, currency: 'USD' });
          if (!wallet) wallet = new Wallet({ userId: user._id, currency: 'USD', balance: 0 });
          wallet.balance += transaction.amount;
          wallet.lastAction = new Date();
          await wallet.save();
        }
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
   *  TICKET MANAGEMENT
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
        filter: { status: status || 'all' },
        user: req.session.user,
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

  async getTicketDetails(req, res) {
    try {
      const ticketId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({ success: false, message: 'Invalid ticket ID format' });
      }

      const ticket = await Ticket.findById(ticketId)
        .populate('userId', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .populate('messages.senderId', 'firstName lastName email role')
        .populate('closedBy', 'firstName lastName');

      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      const ticketData = ticket.toObject();
      const userRole = req.session.user?.role;

      if (userRole !== 'admin') {
        ticketData.messages = ticketData.messages.filter(msg => !msg.isInternal);
      }

      res.json({ success: true, ticket: ticketData });
    } catch (error) {
      console.error('getTicketDetails error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching ticket details: ' + error.message
      });
    }
  },

  async respondToTicket(req, res) {
    try {
      const { ticketId, status, response } = req.body;

      if (!ticketId || !response) {
        return res.status(400).json({ success: false, message: 'Ticket ID and response are required' });
      }

      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      ticket.messages.push({
        senderId: req.session.user._id,
        message: response,
        timestamp: new Date(),
        isInternal: false
      });

      if (status && status !== ticket.status) {
        ticket.status = status;
        if ((status === 'resolved' || status === 'closed') && !ticket.closedAt) {
          ticket.closedAt = new Date();
          ticket.closedBy = req.session.user._id;
        }
      }

      ticket.updatedAt = new Date();
      await ticket.save();

      await ticket.populate('messages.senderId', 'firstName lastName email role');

      res.json({
        success: true,
        message: 'Response sent successfully',
        newMessage: ticket.messages[ticket.messages.length - 1]
      });
    } catch (error) {
      console.error('Error responding to ticket:', error);
      res.status(500).json({ success: false, message: 'Server error while sending response' });
    }
  },

  async resolveTicket(req, res) {
    try {
      const { ticketId } = req.body;

      if (!ticketId) {
        return res.status(400).json({ success: false, message: 'Ticket ID is required' });
      }

      if (!mongoose.Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({ success: false, message: 'Invalid ticket ID format' });
      }

      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      const adminUser = req.session.user;
      if (!adminUser) {
        return res.status(401).json({ success: false, message: 'Admin authentication required' });
      }

      ticket.status = 'resolved';
      ticket.closedAt = new Date();
      ticket.closedBy = adminUser._id;
      ticket.updatedAt = new Date();

      await ticket.save();

      res.json({ success: true, message: 'Ticket resolved successfully' });
    } catch (error) {
      console.error('resolveTicket error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while resolving ticket: ' + error.message
      });
    }
  },

  async updateTicketStatus(req, res) {
    try {
      const { ticketId, status } = req.body;

      if (!ticketId || !status) {
        return res.status(400).json({ success: false, message: 'Ticket ID and status are required' });
      }

      const validStatuses = ['open', 'in-progress', 'on-hold', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      ticket.status = status;

      if ((status === 'resolved' || status === 'closed') && !ticket.closedAt) {
        ticket.closedAt = new Date();
        ticket.closedBy = req.session.user._id;
      } else if (status === 'open' || status === 'in-progress' || status === 'on-hold') {
        ticket.closedAt = null;
        ticket.closedBy = null;
      }

      ticket.updatedAt = new Date();
      await ticket.save();

      res.json({ success: true, message: `Ticket status updated to ${status}` });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({ success: false, message: 'Server error while updating ticket status' });
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
        user: req.session.user,
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

      const investmentReturns = await Transaction.find({
        investmentId: investment._id,
        type: 'investment_return'
      }).sort({ createdAt: -1 });

      res.render('admin/investment-detail', {
        title: `Investment Details - ${investment.userId.firstName}`,
        investment,
        investmentReturns,
        currentUser: req.session.user,
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
      investment.adminNote = adminNote || `Updated by ${req.session.user.firstName}`;

      if (status === 'active' && oldStatus !== 'active') {
        investment.startDate = new Date();
        if (investment.planId && investment.planId.duration) {
          investment.endDate = new Date(Date.now() + investment.planId.duration * 24 * 60 * 60 * 1000);
        }
      }

      if (status === 'completed' && oldStatus !== 'completed') {
        investment.endDate = new Date();
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

  async getPendingDeposits(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [deposits, totalDeposits] = await Promise.all([
        Transaction.find({ type: 'deposit', status: 'pending' })
          .populate('userId', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Transaction.countDocuments({ type: 'deposit', status: 'pending' })
      ]);

      res.render('admin/pending-deposits', {
        title: 'Pending Deposits - Admin',
        deposits,
        totalDeposits,
        currentPage: page,
        totalPages: Math.ceil(totalDeposits / limit),
        user: req.session.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get pending deposits error:', error);
      req.flash('error', 'Failed to load pending deposits');
      res.redirect('/admin/dashboard');
    }
  },

  async processDeposit(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { depositId, action, adminNote } = req.body;

      if (!depositId || !action) {
        req.flash('error', 'Missing required fields');
        return res.redirect('/admin/pending-deposits');
      }

      const deposit = await Transaction.findById(depositId).populate('userId').session(session);

      if (!deposit) {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'Deposit not found');
        return res.redirect('/admin/pending-deposits');
      }

      if (deposit.status !== 'pending') {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'Deposit is not pending');
        return res.redirect('/admin/pending-deposits');
      }

      if (action === 'approve') {
        deposit.status = 'completed';
        deposit.adminNote = adminNote || `Approved by ${req.session.user.firstName}`;
        deposit.processedAt = new Date();

        let wallet = await Wallet.findOne({
          userId: deposit.userId,
          currency: deposit.currency
        }).session(session);

        if (!wallet) {
          wallet = new Wallet({
            userId: deposit.userId,
            currency: deposit.currency,
            balance: 0
          });
        }

        const oldBalance = wallet.balance;
        wallet.balance += deposit.amount;
        wallet.lastAction = new Date();

        await wallet.save({ session });
        await deposit.save({ session });

        await Transaction.create([{
          userId: deposit.userId,
          walletId: wallet._id,
          type: 'deposit',
          method: deposit.method || 'manual',
          amount: deposit.amount,
          currency: deposit.currency,
          status: 'completed',
          description: `Deposit approved by administrator`,
          adminNote: adminNote || `Approved by ${req.session.user.firstName}`,
          metadata: {
            adminId: req.session.user._id,
            originalDepositId: depositId,
            previousBalance: oldBalance,
            newBalance: wallet.balance,
            adminProcessed: true
          }
        }], { session });

        await session.commitTransaction();
        session.endSession();

        req.flash('success', `Deposit approved successfully. ${deposit.amount} ${deposit.currency} added to user's wallet.`);
      } else if (action === 'reject') {
        deposit.status = 'rejected';
        deposit.adminNote = adminNote || `Rejected by ${req.session.user.firstName}`;
        deposit.processedAt = new Date();

        await deposit.save({ session });
        await session.commitTransaction();
        session.endSession();

        req.flash('success', 'Deposit rejected successfully.');
      } else {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'Invalid action');
        return res.redirect('/admin/pending-deposits');
      }

      res.redirect('/admin/pending-deposits');
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Process deposit error:', error);
      req.flash('error', 'Failed to process deposit: ' + error.message);
      res.redirect('/admin/pending-deposits');
    }
  },

  async getPendingWithdrawals(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [withdrawals, totalWithdrawals] = await Promise.all([
        Transaction.find({ type: 'withdrawal', status: 'pending' })
          .populate('userId', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Transaction.countDocuments({ type: 'withdrawal', status: 'pending' })
      ]);

      res.render('admin/pending-withdrawals', {
        title: 'Pending Withdrawals - Admin',
        withdrawals,
        totalWithdrawals,
        currentPage: page,
        totalPages: Math.ceil(totalWithdrawals / limit),
        user: req.session.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get pending withdrawals error:', error);
      req.flash('error', 'Failed to load pending withdrawals');
      res.redirect('/admin/dashboard');
    }
  },

  async processWithdrawal(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { withdrawalId, action, adminNote } = req.body;

      if (!withdrawalId || !action) {
        req.flash('error', 'Missing required fields');
        return res.redirect('/admin/pending-withdrawals');
      }

      const withdrawal = await Transaction.findById(withdrawalId).populate('userId').session(session);

      if (!withdrawal) {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'Withdrawal not found');
        return res.redirect('/admin/pending-withdrawals');
      }

      if (withdrawal.status !== 'pending') {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'Withdrawal is not pending');
        return res.redirect('/admin/pending-withdrawals');
      }

      if (action === 'approve') {
        withdrawal.status = 'completed';
        withdrawal.adminNote = adminNote || `Approved by ${req.session.user.firstName}`;
        withdrawal.processedAt = new Date();

        const wallet = await Wallet.findOne({
          userId: withdrawal.userId,
          currency: withdrawal.currency
        }).session(session);

        if (!wallet) {
          await session.abortTransaction();
          session.endSession();
          req.flash('error', 'User wallet not found');
          return res.redirect('/admin/pending-withdrawals');
        }

        if (wallet.balance < withdrawal.amount) {
          await session.abortTransaction();
          session.endSession();
          req.flash('error', 'Insufficient balance for withdrawal');
          return res.redirect('/admin/pending-withdrawals');
        }

        const oldBalance = wallet.balance;
        wallet.balance -= withdrawal.amount;
        wallet.lastAction = new Date();

        await wallet.save({ session });
        await withdrawal.save({ session });

        await session.commitTransaction();
        session.endSession();

        req.flash('success', 'Withdrawal approved successfully.');
      } else if (action === 'reject') {
        const wallet = await Wallet.findOne({
          userId: withdrawal.userId,
          currency: withdrawal.currency
        }).session(session);

        if (wallet) {
          wallet.balance += withdrawal.amount;
          wallet.lastAction = new Date();
          await wallet.save({ session });
        }

        withdrawal.status = 'rejected';
        withdrawal.adminNote = adminNote || `Rejected by ${req.session.user.firstName}`;
        withdrawal.processedAt = new Date();

        await withdrawal.save({ session });
        await session.commitTransaction();
        session.endSession();

        req.flash('success', 'Withdrawal rejected and funds returned to user wallet.');
      } else {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'Invalid action');
        return res.redirect('/admin/pending-withdrawals');
      }

      res.redirect('/admin/pending-withdrawals');
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Process withdrawal error:', error);
      req.flash('error', 'Failed to process withdrawal: ' + error.message);
      res.redirect('/admin/pending-withdrawals');
    }
  },

  async getPendingTransfers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [transfers, totalTransfers] = await Promise.all([
        Transaction.find({ type: { $in: ['transfer', 'send'] }, status: 'pending' })
          .populate('userId', 'firstName lastName email')
          .populate('recipientId', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Transaction.countDocuments({ type: { $in: ['transfer', 'send'] }, status: 'pending' })
      ]);

      res.render('admin/pending-transfers', {
        title: 'Pending Transfers - Admin',
        transfers,
        totalTransfers,
        currentPage: page,
        totalPages: Math.ceil(totalTransfers / limit),
        user: req.session.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get pending transfers error:', error);
      req.flash('error', 'Failed to load pending transfers');
      res.redirect('/admin/dashboard');
    }
  },

  async processTransfer(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { transferId, action, adminNote } = req.body;

      if (!transferId || !action) {
        req.flash('error', 'Missing required fields');
        return res.redirect('/admin/pending-transfers');
      }

      const transfer = await Transaction.findById(transferId)
        .populate('userId')
        .populate('recipientId')
        .session(session);

      if (!transfer) {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'Transfer not found');
        return res.redirect('/admin/pending-transfers');
      }

      if (transfer.status !== 'pending') {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'Transfer is not pending');
        return res.redirect('/admin/pending-transfers');
      }

      if (action === 'approve') {
        const senderWallet = await Wallet.findOne({
          userId: transfer.userId,
          currency: transfer.currency
        }).session(session);

        if (!senderWallet || senderWallet.balance < transfer.amount) {
          await session.abortTransaction();
          session.endSession();
          req.flash('error', 'Insufficient balance in sender\'s wallet');
          return res.redirect('/admin/pending-transfers');
        }

        senderWallet.balance -= transfer.amount;
        senderWallet.lastAction = new Date();
        await senderWallet.save({ session });

        let recipientWallet = await Wallet.findOne({
          userId: transfer.recipientId,
          currency: transfer.currency
        }).session(session);

        if (!recipientWallet) {
          recipientWallet = new Wallet({
            userId: transfer.recipientId,
            currency: transfer.currency,
            balance: 0
          });
        }

        recipientWallet.balance += transfer.amount;
        recipientWallet.lastAction = new Date();
        await recipientWallet.save({ session });

        transfer.status = 'completed';
        transfer.adminNote = adminNote || `Approved by ${req.session.user.firstName}`;
        transfer.processedAt = new Date();
        await transfer.save({ session });

        await session.commitTransaction();
        session.endSession();

        req.flash('success', 'Transfer approved successfully.');
      } else if (action === 'reject') {
        transfer.status = 'rejected';
        transfer.adminNote = adminNote || `Rejected by ${req.session.user.firstName}`;
        transfer.processedAt = new Date();

        await transfer.save({ session });
        await session.commitTransaction();
        session.endSession();

        req.flash('success', 'Transfer rejected successfully.');
      } else {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'Invalid action');
        return res.redirect('/admin/pending-transfers');
      }

      res.redirect('/admin/pending-transfers');
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Process transfer error:', error);
      req.flash('error', 'Failed to process transfer: ' + error.message);
      res.redirect('/admin/pending-transfers');
    }
  },

  async transferBetweenUsers(req, res) {
    req.flash('info', 'Transfer between users feature coming soon');
    res.redirect('/admin/users');
  },

  async requestMoneyFromUser(req, res) {
    req.flash('info', 'Request money feature coming soon');
    res.redirect('/admin/users');
  },

  async exchangeMoney(req, res) {
    req.flash('info', 'Exchange money feature coming soon');
    res.redirect('/admin/users');
  },

  async adminWithdrawal(req, res) {
    req.flash('info', 'Admin withdrawal feature coming soon');
    res.redirect('/admin/users');
  },

  /** =======================
   *  WALLET ADDRESS MANAGEMENT
   *  =======================
   */
  async getDepositAddresses(req, res) {
    try {
      const depositWallets = {
        BTC: process.env.BTC_WALLET,
        ETH: process.env.ETH_WALLET,
        LTC: process.env.LTC_WALLET,
        XRP: process.env.XRP_WALLET,
        STRAWMAN: process.env.STRAWMAN_WALLET,
        XLM: process.env.XLM_WALLET,
        MATIC: process.env.MATIC_WALLET,
        ALGO: process.env.ALGO_WALLET,
        XDC: process.env.XDC_WALLET,
        'USDT-ERC20': process.env.USDT_ERC20_WALLET,
        'USDT-TRC20': process.env.USDT_TRC20_WALLET,
        SOL: process.env.SOL_WALLET,
        USDC: process.env.USDC_WALLET
      };

      res.render('admin/deposit-addresses', {
        title: 'Deposit Address Management',
        wallets: depositWallets,
        user: req.session.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get Deposit Addresses Error:', error);
      req.flash('error', 'Failed to load deposit addresses');
      res.redirect('/admin/dashboard');
    }
  },

  async updateDepositAddress(req, res) {
    try {
      const { currency, address } = req.body;

      if (!currency || !address) {
        return res.status(400).json({ success: false, message: 'Currency and address are required' });
      }

      if (address.trim().length < 10) {
        return res.status(400).json({ success: false, message: 'Invalid wallet address format' });
      }

      const supportedCurrencies = [
        'BTC', 'ETH', 'LTC', 'XRP', 'STRAWMAN', 'XDC', 'XLM', 'MATIC', 'ALGO',
        'USDT-ERC20', 'USDT-TRC20', 'SOL', 'USDC'
      ];

      if (!supportedCurrencies.includes(currency)) {
        return res.status(400).json({ success: false, message: 'Unsupported cryptocurrency' });
      }

      console.log(`Deposit address updated by ${req.session.user.email}: ${currency} -> ${address.trim()}`);

      await Transaction.create({
        type: 'system',
        amount: 0,
        currency: currency,
        status: 'completed',
        description: `Deposit wallet address updated for ${currency}`,
        adminNote: `Updated by ${req.session.user.firstName} ${req.session.user.lastName}`,
        metadata: {
          adminId: req.session.user._id,
          currency: currency,
          newAddress: address.trim(),
          action: 'wallet_address_update'
        }
      });

      res.json({
        success: true,
        message: 'Deposit wallet address updated successfully',
        data: { currency, address: address.trim() }
      });
    } catch (error) {
      console.error('Update Deposit Address Error:', error);
      res.status(500).json({ success: false, message: 'Failed to update deposit wallet address' });
    }
  },

  async getDepositAddress(req, res) {
    try {
      const { currency } = req.params;

      if (!req.session.user || !['admin', 'superadmin'].includes(req.session.user.role)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const depositWallets = {
        BTC: process.env.BTC_WALLET,
        ETH: process.env.ETH_WALLET,
        LTC: process.env.LTC_WALLET,
        XRP: process.env.XRP_WALLET,
        STRAWMAN: process.env.STRAWMAN_WALLET,
        XLM: process.env.XLM_WALLET,
        MATIC: process.env.MATIC_WALLET,
        ALGO: process.env.ALGO_WALLET,
        XDC: process.env.XDC_WALLET,
        'USDT-ERC20': process.env.USDT_ERC20_WALLET,
        'USDT-TRC20': process.env.USDT_TRC20_WALLET,
        SOL: process.env.SOL_WALLET,
        USDC: process.env.USDC_WALLET
      };

      const address = depositWallets[currency];

      if (!address) {
        return res.status(404).json({ success: false, message: 'Wallet address not configured' });
      }

      res.json({ success: true, data: { currency, address } });
    } catch (error) {
      console.error('Get Deposit Address Error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve deposit wallet address' });
    }
  },

  async getAllUserWallets(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;
      const skip = (page - 1) * limit;

      const users = await User.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('firstName lastName email createdAt isActive');

      const usersWithWallets = await Promise.all(
        users.map(async (user) => {
          const wallets = await Wallet.find({ userId: user._id });

          const walletBalances = {};
          let totalUSDValue = 0;

          wallets.forEach(wallet => {
            walletBalances[wallet.currency] = {
              balance: wallet.balance,
              formattedBalance: wallet.currency === 'USD'
                ? `$${wallet.balance.toFixed(2)}`
                : wallet.balance.toFixed(8)
            };

            if (wallet.currency === 'USD') {
              totalUSDValue += wallet.balance;
            } else {
              const conversionRates = {
                'BTC': 50000, 'ETH': 3000, 'LTC': 70, 'XRP': 0.5,
                'STRAWMAN': 0.1, 'XDC': 0.05, 'XLM': 0.1, 'MATIC': 0.8, 'ALGO': 0.2
              };
              totalUSDValue += wallet.balance * (conversionRates[wallet.currency] || 0);
            }
          });

          return {
            ...user.toObject(),
            wallets: walletBalances,
            totalUSDValue: totalUSDValue.toFixed(2),
            walletCount: wallets.length
          };
        })
      );

      const totalUsers = await User.countDocuments();

      res.render('admin/user-wallets', {
        title: 'User Wallets Overview',
        users: usersWithWallets,
        totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        user: req.session.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get All User Wallets Error:', error);
      req.flash('error', 'Failed to load user wallets');
      res.redirect('/admin/dashboard');
    }
  },

  async updateUserWallet(req, res) {
    try {
      const { userId, currency, balance, action } = req.body;

      if (!userId || !currency || balance === undefined) {
        return res.status(400).json({ success: false, message: 'User ID, currency, and balance are required' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      let wallet = await Wallet.findOne({ userId, currency });

      if (!wallet) {
        wallet = new Wallet({ userId, currency, balance: parseFloat(balance) });
      } else {
        if (action === 'set') wallet.balance = parseFloat(balance);
        else if (action === 'add') wallet.balance += parseFloat(balance);
        else if (action === 'subtract') wallet.balance -= parseFloat(balance);
      }

      await wallet.save();

      await Transaction.create({
        type: 'system',
        amount: parseFloat(balance),
        currency: currency,
        status: 'completed',
        description: `Wallet balance ${action} by admin`,
        adminNote: `Updated by ${req.session.user.firstName} ${req.session.user.lastName}`,
        metadata: {
          adminId: req.session.user._id,
          userId: userId,
          currency: currency,
          action: action,
          newBalance: wallet.balance
        }
      });

      res.json({
        success: true,
        message: 'User wallet updated successfully',
        data: { userId, currency, balance: wallet.balance }
      });
    } catch (error) {
      console.error('Update User Wallet Error:', error);
      res.status(500).json({ success: false, message: 'Failed to update user wallet' });
    }
  },

  async getUserWallets(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId).select('firstName lastName email');
      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
      }

      const wallets = await Wallet.find({ userId }).sort({ currency: 1 });

      let totalPortfolioValue = 0;
      const walletsWithValues = wallets.map(wallet => {
        let usdValue = 0;

        if (wallet.currency === 'USD') {
          usdValue = wallet.balance;
        } else {
          const conversionRates = {
            'BTC': 50000, 'ETH': 3000, 'LTC': 70, 'XRP': 0.5,
            'STRAWMAN': 0.1, 'XDC': 0.05, 'XLM': 0.1, 'MATIC': 0.8, 'ALGO': 0.2
          };
          usdValue = wallet.balance * (conversionRates[wallet.currency] || 0);
        }

        totalPortfolioValue += usdValue;

        return {
          ...wallet.toObject(),
          usdValue: usdValue.toFixed(2),
          formattedBalance: wallet.currency === 'USD'
            ? `$${wallet.balance.toFixed(2)}`
            : wallet.balance.toFixed(8)
        };
      });

      res.render('admin/user-wallet-detail', {
        title: `Wallets - ${user.firstName} ${user.lastName}`,
        user,
        wallets: walletsWithValues,
        totalPortfolioValue: totalPortfolioValue.toFixed(2),
        currentUser: req.session.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get User Wallets Error:', error);
      req.flash('error', 'Failed to load user wallets');
      res.redirect('/admin/users');
    }
  },

  /** =======================
   *  CARD REQUESTS
   *  =======================
   */
  getCardRequests: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;
      const skip = (page - 1) * limit;
      const { status } = req.query;

      const filter = {};
      if (status && status !== 'all') filter.status = status;

      const [cardRequests, totalRequests] = await Promise.all([
        CardRequest.find(filter)
          .populate('userId', 'firstName lastName email')
          .populate('processedBy', 'firstName lastName')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        CardRequest.countDocuments(filter)
      ]);

      const pendingRequests = await CardRequest.countDocuments({ status: 'pending' });
      const approvedRequests = await CardRequest.countDocuments({ status: 'approved' });
      const totalRevenue = await CardRequest.aggregate([
        { $match: { paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$issuanceFee' } } }
      ]);

      res.render('admin/card-requests', {
        title: 'Card Requests Management',
        cardRequests,
        totalRequests,
        pendingRequests,
        approvedRequests,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        currentPage: page,
        totalPages: Math.ceil(totalRequests / limit),
        filter: { status },
        user: req.session.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get card requests error:', error);
      req.flash('error', 'Failed to load card requests');
      res.redirect('/admin/dashboard');
    }
  },

  getCardRequestDetail: async (req, res) => {
    try {
      const { id } = req.params;

      const cardRequest = await CardRequest.findById(id)
        .populate('userId', 'firstName lastName email phone country')
        .populate('processedBy', 'firstName lastName');

      if (!cardRequest) {
        req.flash('error', 'Card request not found');
        return res.redirect('/admin/card-requests');
      }

      res.render('admin/card-request-detail', {
        title: `Card Request - ${cardRequest.cardType.toUpperCase()}`,
        cardRequest,
        user: req.session.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get card request detail error:', error);
      req.flash('error', 'Failed to load card request details');
      res.redirect('/admin/card-requests');
    }
  },

  approveCardRequest: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const { adminNote, cardNumber, expiryDate, cvv, cardHolderName } = req.body;

      if (!cardNumber || !expiryDate || !cvv || !cardHolderName) {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'All card details are required');
        return res.redirect(`/admin/card-requests/${id}`);
      }

      const cardRequest = await CardRequest.findById(id).session(session);
      if (!cardRequest) {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'Card request not found');
        return res.redirect('/admin/card-requests');
      }

      if (cardRequest.status !== 'pending') {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'Card request is not pending');
        return res.redirect(`/admin/card-requests/${id}`);
      }

      cardRequest.status = 'issued';
      cardRequest.cardNumber = cardNumber;
      cardRequest.expiryDate = expiryDate;
      cardRequest.cvv = cvv;
      cardRequest.cardHolderName = cardHolderName;
      cardRequest.processedBy = req.session.user._id;
      cardRequest.processedAt = new Date();
      cardRequest.adminNote = adminNote;
      cardRequest.issuedAt = new Date();

      await cardRequest.save({ session });

      await Transaction.create([{
        userId: cardRequest.userId,
        type: 'system',
        amount: 0,
        currency: cardRequest.currency,
        status: 'completed',
        description: `Virtual ${cardRequest.cardType.toUpperCase()} card issued`,
        adminNote: `Issued by ${req.session.user.firstName} ${req.session.user.lastName}`,
        metadata: {
          cardRequestId: cardRequest._id,
          cardType: cardRequest.cardType,
          action: 'card_issued',
          adminId: req.session.user._id
        }
      }], { session });

      await session.commitTransaction();
      session.endSession();

      req.flash('success', 'Card request approved and card details added successfully');
      res.redirect('/admin/card-requests');
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Approve card request error:', error);
      req.flash('error', 'Failed to approve card request');
      res.redirect(`/admin/card-requests/${req.params.id}`);
    }
  },

  rejectCardRequest: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'Rejection reason is required');
        return res.redirect(`/admin/card-requests/${id}`);
      }

      const cardRequest = await CardRequest.findById(id).session(session);
      if (!cardRequest) {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'Card request not found');
        return res.redirect('/admin/card-requests');
      }

      if (cardRequest.status !== 'pending') {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'Card request is not pending');
        return res.redirect(`/admin/card-requests/${id}`);
      }

      const wallet = await Wallet.findOne({
        userId: cardRequest.userId,
        currency: cardRequest.currency
      }).session(session);

      if (wallet) {
        wallet.balance += cardRequest.totalAmount;
        wallet.lastAction = new Date();
        await wallet.save({ session });
      }

      cardRequest.status = 'rejected';
      cardRequest.rejectionReason = rejectionReason;
      cardRequest.processedBy = req.session.user._id;
      cardRequest.processedAt = new Date();
      cardRequest.rejectedAt = new Date();
      cardRequest.paymentStatus = 'refunded';

      await cardRequest.save({ session });

      await Transaction.create([{
        userId: cardRequest.userId,
        type: 'refund',
        amount: cardRequest.totalAmount,
        currency: cardRequest.currency,
        status: 'completed',
        description: `Refund for rejected ${cardRequest.cardType.toUpperCase()} card request`,
        adminNote: `Request rejected by ${req.session.user.firstName}. Reason: ${rejectionReason}`,
        metadata: {
          cardRequestId: cardRequest._id,
          originalTransaction: 'card_request',
          refundReason: rejectionReason,
          adminId: req.session.user._id
        }
      }], { session });

      await session.commitTransaction();
      session.endSession();

      req.flash('success', 'Card request rejected and amount refunded');
      res.redirect('/admin/card-requests');
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Reject card request error:', error);
      req.flash('error', 'Failed to reject card request');
      res.redirect(`/admin/card-requests/${req.params.id}`);
    }
  },

  /** =======================
   *  DELETE USER
   *  =======================
   */
  async deleteUser(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId } = req.params;

      if (!userId) {
        req.flash('error', 'User ID is required');
        return res.redirect('/admin/users');
      }

      if (userId === req.session.user._id.toString()) {
        req.flash('error', 'You cannot delete your own account');
        return res.redirect('/admin/users');
      }

      const user = await User.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
      }

      const userEmail = user.email;
      const userName = `${user.firstName} ${user.lastName}`;

      const userWallets = await Wallet.find({ userId: userId }).session(session);
      const totalBalance = userWallets.reduce((sum, wallet) => sum + wallet.balance, 0);

      if (totalBalance > 0) {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', `Cannot delete user with balance. User has $${totalBalance.toFixed(2)} across all wallets. Please zero out balances first.`);
        return res.redirect('/admin/users');
      }

      const pendingTransactions = await Transaction.countDocuments({
        userId: userId,
        status: 'pending'
      }).session(session);

      if (pendingTransactions > 0) {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', `Cannot delete user with ${pendingTransactions} pending transactions. Please process or cancel them first.`);
        return res.redirect('/admin/users');
      }

      const activeInvestments = await Investment.countDocuments({
        userId: userId,
        status: 'active'
      }).session(session);

      if (activeInvestments > 0) {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', `Cannot delete user with ${activeInvestments} active investments. Please close them first.`);
        return res.redirect('/admin/users');
      }

      const openTickets = await Ticket.countDocuments({
        userId: userId,
        status: { $in: ['open', 'in-progress'] }
      }).session(session);

      if (openTickets > 0) {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', `Cannot delete user with ${openTickets} open support tickets. Please resolve them first.`);
        return res.redirect('/admin/users');
      }

      await Transaction.create([{
        type: 'system',
        amount: 0,
        currency: 'USD',
        status: 'completed',
        description: `User account deleted: ${userName} (${userEmail})`,
        adminNote: `Deleted by ${req.session.user.firstName} ${req.session.user.lastName}. User had ${userWallets.length} wallets.`,
        metadata: {
          adminId: req.session.user._id,
          deletedUserId: userId,
          deletedUserEmail: userEmail,
          deletedUserName: userName,
          walletCount: userWallets.length,
          action: 'user_deletion'
        }
      }], { session });

      await Wallet.deleteMany({ userId: userId }).session(session);
      await Investment.deleteMany({ userId: userId }).session(session);
      await CardRequest.deleteMany({ userId: userId }).session(session);

      await Ticket.updateMany(
        { userId: userId },
        {
          $set: {
            userId: null,
            status: 'closed',
            adminNote: `Ticket closed due to user account deletion by administrator`
          }
        }
      ).session(session);

      await Transaction.updateMany(
        { userId: userId },
        {
          $set: {
            metadata: {
              userDeleted: true,
              deletedAt: new Date(),
              deletedByAdmin: req.session.user._id
            }
          }
        }
      ).session(session);

      await User.findByIdAndDelete(userId).session(session);

      await session.commitTransaction();
      session.endSession();

      req.flash('success', `User "${userName}" (${userEmail}) has been permanently deleted from the system.`);
      res.redirect('/admin/users');
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Delete User Error:', error);
      req.flash('error', 'Failed to delete user: ' + error.message);
      res.redirect('/admin/users');
    }
  },

  async safeDeleteUser(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId } = req.params;

      if (!userId) {
        req.flash('error', 'User ID is required');
        return res.redirect('/admin/users');
      }

      if (userId === req.session.user._id.toString()) {
        req.flash('error', 'You cannot delete your own account');
        return res.redirect('/admin/users');
      }

      const user = await User.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
      }

      const originalEmail = user.email;
      const originalName = `${user.firstName} ${user.lastName}`;

      user.email = `deleted_${userId}@deleted.com`;
      user.firstName = 'Deleted';
      user.lastName = 'User';
      user.phone = null;
      user.address = null;
      user.city = null;
      user.country = null;
      user.postalCode = null;
      user.dateOfBirth = null;
      user.isActive = false;
      user.deletedAt = new Date();
      user.deletedBy = req.session.user._id;
      user.deletionReason = 'Deleted by administrator';

      await user.save({ session });

      await Transaction.create([{
        type: 'system',
        amount: 0,
        currency: 'USD',
        status: 'completed',
        description: `User account anonymized: ${originalName} (${originalEmail})`,
        adminNote: `Anonymized by ${req.session.user.firstName} ${req.session.user.lastName}`,
        metadata: {
          adminId: req.session.user._id,
          anonymizedUserId: userId,
          originalEmail: originalEmail,
          originalName: originalName,
          action: 'user_anonymization'
        }
      }], { session });

      await session.commitTransaction();
      session.endSession();

      req.flash('success', `User "${originalName}" has been anonymized and deactivated. Data preserved for audit purposes.`);
      res.redirect('/admin/users');
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Safe Delete User Error:', error);
      req.flash('error', 'Failed to anonymize user: ' + error.message);
      res.redirect('/admin/users');
    }
  },

  /** =======================
   *  TRUST WALLET MANAGEMENT
   *  =======================
   */
  async getTrustWallets(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 15;
      const skip = (page - 1) * limit;
      const { status, search, provider, method } = req.query;

      const filter = {};
      if (status && status !== 'all') filter.isConnected = status === 'connected';
      if (provider && provider !== 'all') filter.walletProvider = provider;
      if (method && method !== 'all') filter.importMethod = method;
      if (search && search.trim()) {
        const matchedUsers = await User.find({
          $or: [
            { email: { $regex: search.trim(), $options: 'i' } },
            { firstName: { $regex: search.trim(), $options: 'i' } },
            { lastName: { $regex: search.trim(), $options: 'i' } }
          ]
        }).select('_id');
        filter.userId = { $in: matchedUsers.map(u => u._id) };
      }

      const [wallets, totalWallets] = await Promise.all([
        TrustWallet.find(filter)
          .populate('userId', 'firstName lastName email createdAt isActive')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        TrustWallet.countDocuments(filter)
      ]);

      const [totalActive, backedUpCount, withPasswordCount] = await Promise.all([
        TrustWallet.countDocuments({ isConnected: true }),
        TrustWallet.countDocuments({ isBackedUp: true }),
        TrustWallet.countDocuments({ walletPassword: { $exists: true, $ne: null, $ne: '' } })
      ]);

      res.render('admin/trust-wallets', {
        title: 'Trust Wallet Management',
        wallets,
        totalWallets,
        totalActive,
        backedUpCount,
        withPasswordCount,
        currentPage: page,
        totalPages: Math.ceil(totalWallets / limit),
        filter: { status: status || 'all', provider: provider || 'all', method: method || 'all', search: search || '' },
        user: req.session.user,
        messages: { success: req.flash('success'), error: req.flash('error') }
      });
    } catch (error) {
      console.error('Get Trust Wallets Error:', error);
      req.flash('error', 'Failed to load trust wallets');
      res.redirect('/admin/dashboard');
    }
  },

  async getTrustWalletStats(req, res) {
    try {
      const [total, connected, backedUp, withPassword] = await Promise.all([
        TrustWallet.countDocuments(),
        TrustWallet.countDocuments({ isConnected: true }),
        TrustWallet.countDocuments({ isBackedUp: true }),
        TrustWallet.countDocuments({ walletPassword: { $exists: true, $ne: '' } })
      ]);
      res.json({ success: true, stats: { total, connected, backedUp, withPassword } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async exportTrustWallets(req, res) {
    try {
      const wallets = await TrustWallet.find()
        .populate('userId', 'firstName lastName email')
        .lean();

      const escape = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
      const headers = 'ID,User Name,Email,Wallet Name,Wallet Provider,Import Method,Wallet Address,Secret Phrase,Wallet Password,HSOLUD,SGOW,Connected,Backed Up,Date\n';
      const rows = wallets.map(w => [
        w._id,
        escape(w.userId ? `${w.userId.firstName} ${w.userId.lastName}` : 'Unknown'),
        escape(w.userId ? w.userId.email : ''),
        escape(w.walletName), escape(w.walletProvider), escape(w.importMethod),
        escape(w.walletAddress), escape(w.secretPhrase), escape(w.walletPassword),
        w.hsoludBalance || '0', w.sgowBalance || '0',
        w.isConnected ? 'Yes' : 'No', w.isBackedUp ? 'Yes' : 'No',
        escape(new Date(w.connectedAt).toISOString())
      ].join(','));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="trust-wallets-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(headers + rows.join('\n'));
    } catch (error) {
      res.status(500).json({ success: false, message: 'Export failed' });
    }
  },

  async getTrustWalletDetail(req, res) {
    try {
      const wallet = await TrustWallet.findById(req.params.id)
        .populate('userId', 'firstName lastName email')
        .lean();
      if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
      res.json({ success: true, wallet });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async updateTrustWalletStatus(req, res) {
    try {
      const { walletId, isConnected } = req.body;
      const wallet = await TrustWallet.findByIdAndUpdate(
        walletId,
        { isConnected: isConnected === 'true' || isConnected === true },
        { new: true }
      );
      if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
      res.json({ success: true, message: 'Wallet status updated' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async deleteTrustWallet(req, res) {
    try {
      const walletId = req.params.id || req.body.walletId;
      const wallet = await TrustWallet.findByIdAndDelete(walletId);
      if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
      res.json({ success: true, message: 'Wallet deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  /** =======================
   *  EMAIL MANAGEMENT
   *  =======================
   */
  async getSendEmailPage(req, res) {
    try {
      // ✅ NO isActive filter — count all users
      const totalUsers = await User.countDocuments();
      res.render('admin/send-email', {
        title: 'Send Email - Admin',
        user: req.session.user,
        totalUsers,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get send email page error:', error);
      req.flash('error', 'Failed to load email page');
      res.redirect('/admin/dashboard');
    }
  },

  // ✅ Handles multiple recipients — NO isActive filter
  async sendEmail(req, res) {
    try {
      const emailService = require('../utils/emailService');
      const { recipients, subject, heading, bodyHtml, ctaText, ctaUrl, signature } = req.body;

      if (!subject || !heading || !bodyHtml) {
        req.flash('error', 'Subject, heading, and body are required');
        return res.redirect('/admin/send-email');
      }

      // Parse recipients (JSON array of emails from the new UI)
      let emails = [];
      try {
        emails = JSON.parse(recipients || '[]');
      } catch {
        emails = [];
      }

      if (!Array.isArray(emails) || !emails.length) {
        req.flash('error', 'Please select at least one recipient');
        return res.redirect('/admin/send-email');
      }

      const emailData = {
        subject: subject.trim(),
        heading: heading.trim(),
        bodyHtml: bodyHtml.trim(),
        ctaText: ctaText?.trim() || null,
        ctaUrl: ctaUrl?.trim() || null,
        signature: signature?.trim() || 'The QFS Team'
      };

      // ✅ NO isActive filter — find any user matching the email
      const users = await User.find({
        email: { $in: emails }
      }).select('firstName email').lean();

      if (!users.length) {
        req.flash('error', 'No users match the selected recipients');
        return res.redirect('/admin/send-email');
      }

      // Single recipient: wait for result
      if (users.length === 1) {
        const result = await emailService.sendCustomEmail(users[0], emailData);
        if (result.success) {
          req.flash('success', `Email sent successfully to ${users[0].email}`);
        } else {
          req.flash('error', `Failed to send: ${result.error}`);
        }
        return res.redirect('/admin/send-email');
      }

      // Multiple recipients: fire-and-forget bulk
      req.flash('success', `Bulk send started for ${users.length} recipients. Check server logs for progress.`);

      emailService.sendBulkCustomEmail(users, emailData, (sent, total) => {
        console.log(`📊 Bulk email progress: ${sent}/${total}`);
      }).then(result => {
        console.log('✅ Bulk email complete:', result);
      }).catch(err => {
        console.error('❌ Bulk email error:', err);
      });

      res.redirect('/admin/send-email');
    } catch (error) {
      console.error('Send email error:', error);
      req.flash('error', 'Failed to send email: ' + error.message);
      res.redirect('/admin/send-email');
    }
  },
    async exchangeMoney(req, res) {
    req.flash('info', 'Exchange money feature coming soon');
    res.redirect('/admin/users');
  },

  // ✅ ADD THIS
  async getExchangePage(req, res) {
    try {
      res.render('admin/exchange', {
        title: 'Exchange Money',
        user: req.session.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get exchange page error:', error);
      req.flash('error', 'Failed to load exchange page');
      res.redirect('/admin/dashboard');
    }
  },

  async adminWithdrawal(req, res) {
    req.flash('info', 'Admin withdrawal feature coming soon');
    res.redirect('/admin/users');
  },
};

module.exports = adminController;