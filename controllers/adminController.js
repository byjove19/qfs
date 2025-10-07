// controllers/adminController.js

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Investment = require('../models/Investment');
const Ticket = require('../models/Ticket');
const Wallet = require('../models/Wallet');
const CardRequest = require('../models/CardRequest');
const mongoose = require('mongoose');

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
        user: req.session.user || null,
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

      const users = await User.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('firstName lastName email createdAt isActive currency');

      // Get wallet balances for each user
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

      // Ensure user data is properly passed
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
        .select('firstName lastName email createdAt isActive currency loginHistory');

      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
      }

      // Get user's wallet balance
      const wallet = await Wallet.findOne({ userId: req.params.id, currency: 'USD' });
      const userBalance = wallet ? wallet.balance : 0;

      const recentTransactions = await Transaction.find({ userId: req.params.id })
        .sort({ createdAt: -1 }).limit(10);

      // Add balance to user object for the template
      const userWithBalance = {
        ...user.toObject(),
        balance: userBalance
      };

      res.render('admin/user-detail', {
        title: `User Details - ${user.firstName} ${user.lastName}`,
        user: userWithBalance,
        recentTransactions,
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
   *  USER BALANCE MANAGEMENT (Multi-currency)
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

      // Get ALL wallet balances for each user
      const usersWithBalances = await Promise.all(
        users.map(async (user) => {
          const wallets = await Wallet.find({ userId: user._id });
          const balances = {};
          let totalBalanceUSD = 0;

          // Calculate balances for each currency
          wallets.forEach(wallet => {
            balances[wallet.currency] = wallet.balance;
            // Here you would convert to USD using exchange rates
            // For now, we'll just sum USD and ignore crypto values
            if (wallet.currency === 'USD') {
              totalBalanceUSD += wallet.balance;
            }
          });

          return {
            ...user.toObject(),
            balances,
            totalBalance: totalBalanceUSD
          };
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
      
      // Validate required fields
      if (!userId || !amount || !type || !currency) {
        req.flash('error', 'Missing required fields');
        return res.redirect(`/admin/users/${userId}`);
      }

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
      }

      // Find or create the user's wallet for the specified currency
      let wallet = await Wallet.findOne({ userId: userId, currency: currency });
      if (!wallet) {
        try {
          wallet = new Wallet({
            userId: userId,
            currency: currency,
            balance: 0
          });
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

      // Validate amount
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        req.flash('error', 'Invalid amount');
        return res.redirect(`/admin/users/${userId}`);
      }

      const oldBalance = wallet.balance || 0;
      let newBalance = oldBalance;
      let transactionType = '';
      let transactionDescription = '';

      // Process balance update based on type
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

      // Update wallet balance
      wallet.balance = newBalance;
      wallet.lastAction = new Date();
      await wallet.save();

      // Create transaction record
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
  async getTransactions(req, res) {
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
      transaction.adminNote = adminNote || `Updated by ${req.session.user.firstName}`;
      transaction.processedAt = new Date();

      // Deposit Approval
      if (status === 'completed' && transaction.type === 'deposit') {
        const user = await User.findById(transaction.userId);
        if (user) {
          let wallet = await Wallet.findOne({ userId: user._id, currency: 'USD' });
          if (!wallet) {
            wallet = new Wallet({
              userId: user._id,
              currency: 'USD',
              balance: 0
            });
          }
          wallet.balance += transaction.amount;
          wallet.lastAction = new Date();
          await wallet.save();
        }
      }

      // Withdrawal Rejection Refund
      if (status === 'rejected' && transaction.type === 'withdrawal') {
        const user = await User.findById(transaction.userId);
        if (user) {
          let wallet = await Wallet.findOne({ userId: user._id, currency: 'USD' });
          if (!wallet) {
            wallet = new Wallet({
              userId: user._id,
              currency: 'USD',
              balance: 0
            });
          }
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

      // Get investment returns/history
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
  
  // Get pending deposits
  async getPendingDeposits(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [deposits, totalDeposits] = await Promise.all([
        Transaction.find({ 
          type: 'deposit', 
          status: 'pending' 
        })
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

  // Approve/Reject deposit
  async processDeposit(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { depositId, action, adminNote } = req.body;
      
      if (!depositId || !action) {
        req.flash('error', 'Missing required fields');
        return res.redirect('/admin/pending-deposits');
      }

      // Find deposit with session
      const deposit = await Transaction.findById(depositId)
        .populate('userId')
        .session(session);

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
        // Update deposit status
        deposit.status = 'completed';
        deposit.adminNote = adminNote || `Approved by ${req.session.user.firstName}`;
        deposit.processedAt = new Date();

        // Find or create user's wallet with session
        let wallet = await Wallet.findOne({ 
          userId: deposit.userId, // Use deposit.userId directly (it's populated)
          currency: deposit.currency 
        }).session(session);
        
        if (!wallet) {
          wallet = new Wallet({
            userId: deposit.userId,
            currency: deposit.currency,
            balance: 0
          });
        }

        // Add funds to wallet
        const oldBalance = wallet.balance;
        wallet.balance += deposit.amount;
        wallet.lastAction = new Date();
        
        await wallet.save({ session });
        await deposit.save({ session });

        // Create a transaction record for the wallet credit
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
        Transaction.find({ 
          type: 'withdrawal', 
          status: 'pending' 
        })
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

      const withdrawal = await Transaction.findById(withdrawalId)
        .populate('userId')
        .session(session);

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
        // Update withdrawal status
        withdrawal.status = 'completed';
        withdrawal.adminNote = adminNote || `Approved by ${req.session.user.firstName}`;
        withdrawal.processedAt = new Date();
        
        // Verify the user has sufficient balance for the withdrawal
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

        // Deduct from wallet (if not already done during withdrawal request)
        const oldBalance = wallet.balance;
        wallet.balance -= withdrawal.amount;
        wallet.lastAction = new Date();
        
        await wallet.save({ session });
        await withdrawal.save({ session });

        await session.commitTransaction();
        session.endSession();

        req.flash('success', 'Withdrawal approved successfully.');
        
      } else if (action === 'reject') {
        // Refund the amount back to user's wallet (if it was deducted during request)
        const wallet = await Wallet.findOne({ 
          userId: withdrawal.userId, 
          currency: withdrawal.currency 
        }).session(session);
        
        if (wallet) {
          // Only refund if the withdrawal amount was previously deducted
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
        Transaction.find({ 
          type: { $in: ['transfer', 'send'] }, 
          status: 'pending' 
        })
          .populate('userId', 'firstName lastName email')
          .populate('recipientId', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Transaction.countDocuments({ 
          type: { $in: ['transfer', 'send'] }, 
          status: 'pending' 
        })
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
        // Check sender's wallet balance
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

        // Deduct from sender
        senderWallet.balance -= transfer.amount;
        senderWallet.lastAction = new Date();
        await senderWallet.save({ session });

        // Find or create recipient's wallet
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

        // Add to recipient
        recipientWallet.balance += transfer.amount;
        recipientWallet.lastAction = new Date();
        await recipientWallet.save({ session });

        // Update transfer status
        transfer.status = 'completed';
        transfer.adminNote = adminNote || `Approved by ${req.session.user.firstName}`;
        transfer.processedAt = new Date();
        await transfer.save({ session });

        await session.commitTransaction();
        session.endSession();

        req.flash('success', 'Transfer approved successfully.');
        
      } else if (action === 'reject') {
        // Update transfer status to rejected
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

  // Placeholder functions for other features
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
  }
};

module.exports = adminController;