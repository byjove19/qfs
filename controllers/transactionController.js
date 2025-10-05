const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const { validationResult } = require('express-validator');

const transactionController = {
  getTransactions: async (req, res) => {
    try {
      console.log('=== TRANSACTIONS PAGE REQUEST ===');
      console.log('Full session:', JSON.stringify(req.session, null, 2));
      console.log('Session user:', req.session.user);
      console.log('Session ID:', req.sessionID);
      
      // FIX: Get userId with multiple fallbacks
      const userId = req.session.user?._id || req.session.user?.id || req.session.userId;
      const userRole = req.session.user?.role;
      
      console.log('Extracted userId:', userId);
      console.log('User role:', userRole);
      
      if (!userId) {
        console.log('❌ CRITICAL: No user ID found in session');
        console.log('Session keys:', Object.keys(req.session));
        console.log('User object:', req.session.user);
        
        // This shouldn't happen if isAuthenticated passed, but handle it
        req.session.destroy((err) => {
          if (err) console.error('Session destroy error:', err);
          req.flash('error', 'Session error. Please login again.');
          return res.redirect('/auth/login');
        });
        return;
      }

      console.log('✅ User authenticated, fetching transactions for:', userId);

      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      // Build query based on user role
      let query = {};
      
      if (['admin', 'superadmin'].includes(userRole)) {
        // Admins can see all transactions
        console.log('👑 Admin user - showing ALL transactions');
        query = {}; // No filter for admins
      } else {
        // Regular users see their own transactions + admin-approved ones
        console.log('👤 Regular user - showing user transactions');
        query = {
          $or: [
            { userId }, 
            { recipientId: userId },
            // Include transactions where user is involved AND status is approved/completed by admin
            { 
              $and: [
                { $or: [{ userId }, { recipientId: userId }] },
                { status: { $in: ['completed', 'approved'] } }
              ]
            },
            // Include admin-initiated transactions for this user
            {
              $and: [
                { $or: [{ userId }, { recipientId: userId }] },
                { type: { $in: ['admin_credit', 'admin_debit', 'system'] } }
              ]
            }
          ]
        };
      }

      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'firstName lastName email role')
          .populate('recipientId', 'firstName lastName email role')
          .populate('senderId', 'firstName lastName email role')
          .lean(),
        Transaction.countDocuments(query)
      ]);

      console.log(`✅ Found ${transactions.length} transactions out of ${total} total`);

      res.render('transactions', {
        title: 'Transactions - QFS',
        transactions,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        user: req.session.user,
        isAdmin: ['admin', 'superadmin'].includes(userRole)
      });

    } catch (error) {
      console.error('❌ Transactions error:', error);
      res.status(500).render('error/500', { 
        title: 'Server Error',
        error: req.app.get('env') === 'development' ? error : {},
        user: req.session.user
      });
    }
  },

  // SEND MONEY FUNCTIONS
  getSendMoney: async (req, res) => {
    try {
      const userId = req.session.user?._id || req.session.user?.id || req.session.userId;
      
      if (!userId) {
        req.flash('error', 'Please login to send money');
        return res.redirect('/auth/login');
      }

      const wallets = await Wallet.find({ userId }).lean();
      
      res.render('transactions/send', {
        title: 'Send Money - QFS',
        wallets,
        error: req.flash('error'),
        success: req.flash('success'),
        formData: req.flash('formData')[0] || {},
        user: req.session.user
      });
    } catch (error) {
      console.error('Send money error:', error);
      res.status(500).render('error/500', { 
        title: 'Server Error',
        error: req.app.get('env') === 'development' ? error : {},
        user: req.session.user
      });
    }
  },

  sendMoney: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('formData', req.body);
        req.flash('error', errors.array()[0].msg);
        return res.redirect('/transactions/send');
      }

      const { recipientEmail, amount, currency, description } = req.body;
      const senderId = req.session.user?._id || req.session.user?.id || req.session.userId;

      if (!senderId) {
        req.flash('error', 'Please login to send money');
        return res.redirect('/auth/login');
      }

      // Find recipient
      const recipient = await User.findOne({ email: recipientEmail.toLowerCase() });
      if (!recipient) {
        req.flash('formData', req.body);
        req.flash('error', 'Recipient not found');
        return res.redirect('/transactions/send');
      }

      if (recipient._id.toString() === senderId.toString()) {
        req.flash('formData', req.body);
        req.flash('error', 'Cannot send money to yourself');
        return res.redirect('/transactions/send');
      }

      // Find sender's wallet
      const senderWallet = await Wallet.findOne({ 
        userId: senderId, 
        currency 
      });
      
      if (!senderWallet) {
        req.flash('formData', req.body);
        req.flash('error', `No ${currency} wallet found`);
        return res.redirect('/transactions/send');
      }

      const amountNum = parseFloat(amount);
      if (senderWallet.balance < amountNum) {
        req.flash('formData', req.body);
        req.flash('error', 'Insufficient balance');
        return res.redirect('/transactions/send');
      }

      // Find or create recipient's wallet
      let recipientWallet = await Wallet.findOne({ 
        userId: recipient._id, 
        currency 
      });
      
      if (!recipientWallet) {
        recipientWallet = new Wallet({
          userId: recipient._id,
          currency,
          balance: 0
        });
      }

      // Start a session for transaction
      const session = await Transaction.startSession();
      session.startTransaction();

      try {
        // Create transaction
        const transaction = new Transaction({
          userId: senderId,
          walletId: senderWallet._id,
          type: 'send',
          method: 'manual',
          amount: amountNum,
          currency,
          status: 'completed',
          description: description || `Payment to ${recipientEmail}`,
          recipientId: recipient._id
        });

        // Update balances
        senderWallet.balance -= amountNum;
        recipientWallet.balance += amountNum;

        await transaction.save({ session });
        await senderWallet.save({ session });
        await recipientWallet.save({ session });

        // Commit the transaction
        await session.commitTransaction();
        
        req.flash('success', `Successfully sent ${currency} ${amount} to ${recipientEmail}`);
        res.redirect('/transactions');
        
      } catch (error) {
        // Abort transaction on error
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

    } catch (error) {
      console.error('Send money error:', error);
      req.flash('error', 'Failed to send money. Please try again.');
      res.redirect('/transactions/send');
    }
  },

  // REQUEST MONEY FUNCTIONS
  getRequestMoney: async (req, res) => {
    try {
      const userId = req.session.user?._id || req.session.user?.id || req.session.userId;
      
      if (!userId) {
        req.flash('error', 'Please login to request money');
        return res.redirect('/auth/login');
      }

      const wallets = await Wallet.find({ userId }).lean();
      
      res.render('transactions/request-money', {
        title: 'Request Money - QFS',
        wallets,
        error: req.flash('error'),
        success: req.flash('success'),
        formData: req.flash('formData')[0] || {},
        user: req.session.user
      });
    } catch (error) {
      console.error('Request money error:', error);
      res.status(500).render('error/500', { 
        title: 'Server Error',
        error: req.app.get('env') === 'development' ? error : {},
        user: req.session.user
      });
    }
  },

  requestMoney: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('formData', req.body);
        req.flash('error', errors.array()[0].msg);
        return res.redirect('/transactions/request-money');
      }

      const { senderEmail, amount, currency, description } = req.body;
      const requesterId = req.session.user?._id || req.session.user?.id || req.session.userId;

      if (!requesterId) {
        req.flash('error', 'Please login to request money');
        return res.redirect('/auth/login');
      }

      // Find sender
      const sender = await User.findOne({ email: senderEmail.toLowerCase() });
      if (!sender) {
        req.flash('formData', req.body);
        req.flash('error', 'User not found');
        return res.redirect('/transactions/request-money');
      }

      if (sender._id.toString() === requesterId.toString()) {
        req.flash('formData', req.body);
        req.flash('error', 'Cannot request money from yourself');
        return res.redirect('/transactions/request-money');
      }

      const amountNum = parseFloat(amount);

      // Create money request transaction
      const transaction = new Transaction({
        userId: requesterId,
        type: 'request',
        method: 'manual',
        amount: amountNum,
        currency,
        status: 'pending',
        description: description || `Money request from ${senderEmail}`,
        recipientId: sender._id, // The person who needs to fulfill the request
        metadata: {
          requestType: 'money',
          requesterId: requesterId,
          requestedFrom: sender._id
        }
      });

      await transaction.save();

      req.flash('success', `Money request for ${currency} ${amount} sent to ${senderEmail}. They need to approve the payment.`);
      res.redirect('/transactions');
      
    } catch (error) {
      console.error('Request money error:', error);
      req.flash('error', 'Failed to send money request. Please try again.');
      res.redirect('/transactions/request-money');
    }
  },

  // CARD REQUEST FUNCTIONS
  getRequestCard: async (req, res) => {
    try {
      const userId = req.session.user?._id || req.session.user?.id || req.session.userId;
      
      if (!userId) {
        req.flash('error', 'Please login to request a card');
        return res.redirect('/auth/login');
      }

      const wallets = await Wallet.find({ userId }).lean();
      
      res.render('transactions/request-card', {
        title: 'Request Card - QFS',
        wallets,
        error: req.flash('error'),
        success: req.flash('success'),
        formData: req.flash('formData')[0] || {},
        user: req.session.user
      });
    } catch (error) {
      console.error('Request card error:', error);
      res.status(500).render('error/500', { 
        title: 'Server Error',
        error: req.app.get('env') === 'development' ? error : {},
        user: req.session.user
      });
    }
  },

  requestCard: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('formData', req.body);
        req.flash('error', errors.array()[0].msg);
        return res.redirect('/transactions/request-card');
      }

      const { cardType, currency, deliveryAddress } = req.body;
      const userId = req.session.user?._id || req.session.user?.id || req.session.userId;

      if (!userId) {
        req.flash('error', 'Please login to request a card');
        return res.redirect('/auth/login');
      }

      // Check if user has sufficient balance for card fee
      const wallet = await Wallet.findOne({ userId, currency });
      if (!wallet) {
        req.flash('formData', req.body);
        req.flash('error', `No ${currency} wallet found`);
        return res.redirect('/transactions/request-card');
      }

      const cardFee = cardType === 'premium' ? 25 : cardType === 'business' ? 50 : 10; // Example fees

      if (wallet.balance < cardFee) {
        req.flash('formData', req.body);
        req.flash('error', `Insufficient balance for card fee (${currency} ${cardFee})`);
        return res.redirect('/transactions/request-card');
      }

      // Create card request transaction
      const transaction = new Transaction({
        userId,
        type: 'card_request',
        method: 'system',
        amount: cardFee,
        currency,
        status: 'pending',
        description: `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} card request`,
        metadata: {
          requestType: 'card',
          cardType: cardType,
          deliveryAddress: deliveryAddress,
          status: 'under_review'
        }
      });

      await transaction.save();

      req.flash('success', `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} card request submitted successfully. It will be processed within 3-5 business days.`);
      res.redirect('/transactions');
      
    } catch (error) {
      console.error('Card request error:', error);
      req.flash('error', 'Failed to process card request. Please try again.');
      res.redirect('/transactions/request-card');
    }
  },

  // EXCHANGE MONEY FUNCTIONS
  getExchangeMoney: async (req, res) => {
    try {
      const userId = req.session.user?._id || req.session.user?.id || req.session.userId;
      
      if (!userId) {
        req.flash('error', 'Please login to exchange money');
        return res.redirect('/auth/login');
      }

      const wallets = await Wallet.find({ userId }).lean();
      
      res.render('transactions/exchange', {
        title: 'Exchange Money - QFS',
        wallets,
        error: req.flash('error'),
        success: req.flash('success'),
        formData: req.flash('formData')[0] || {},
        user: req.session.user
      });
    } catch (error) {
      console.error('Exchange money error:', error);
      res.status(500).render('error/500', { 
        title: 'Server Error',
        error: req.app.get('env') === 'development' ? error : {},
        user: req.session.user
      });
    }
  },

  exchangeMoney: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('formData', req.body);
        req.flash('error', errors.array()[0].msg);
        return res.redirect('/transactions/exchange');
      }

      const { fromCurrency, toCurrency, amount, exchangeRate } = req.body;
      const userId = req.session.user?._id || req.session.user?.id || req.session.userId;

      if (!userId) {
        req.flash('error', 'Please login to exchange money');
        return res.redirect('/auth/login');
      }

      // Find source wallet
      const sourceWallet = await Wallet.findOne({ userId, currency: fromCurrency });
      if (!sourceWallet) {
        req.flash('formData', req.body);
        req.flash('error', `No ${fromCurrency} wallet found`);
        return res.redirect('/transactions/exchange');
      }

      const amountNum = parseFloat(amount);
      if (sourceWallet.balance < amountNum) {
        req.flash('formData', req.body);
        req.flash('error', 'Insufficient balance');
        return res.redirect('/transactions/exchange');
      }

      // Find or create target wallet
      let targetWallet = await Wallet.findOne({ userId, currency: toCurrency });
      if (!targetWallet) {
        targetWallet = new Wallet({
          userId,
          currency: toCurrency,
          balance: 0
        });
      }

      // Calculate exchanged amount (simplified - in real app, use live rates)
      const calculatedRate = parseFloat(exchangeRate) || await this.getExchangeRate(fromCurrency, toCurrency);
      const exchangedAmount = amountNum * calculatedRate;
      const exchangeFee = exchangedAmount * 0.01; // 1% exchange fee

      const netAmount = exchangedAmount - exchangeFee;

      // Start transaction session
      const session = await Transaction.startSession();
      session.startTransaction();

      try {
        // Update balances
        sourceWallet.balance -= amountNum;
        targetWallet.balance += netAmount;

        // Create exchange transaction
        const transaction = new Transaction({
          userId,
          type: 'exchange',
          method: 'system',
          amount: amountNum,
          currency: fromCurrency,
          status: 'completed',
          description: `Currency exchange from ${fromCurrency} to ${toCurrency}`,
          metadata: {
            fromCurrency,
            toCurrency,
            exchangeRate: calculatedRate,
            exchangedAmount: netAmount,
            exchangeFee: exchangeFee
          }
        });

        await transaction.save({ session });
        await sourceWallet.save({ session });
        await targetWallet.save({ session });

        await session.commitTransaction();
        
        req.flash('success', `Successfully exchanged ${fromCurrency} ${amount} to ${toCurrency} ${netAmount.toFixed(2)} (Rate: ${calculatedRate})`);
        res.redirect('/transactions');
        
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

    } catch (error) {
      console.error('Exchange money error:', error);
      req.flash('error', 'Failed to process exchange. Please try again.');
      res.redirect('/transactions/exchange');
    }
  },

  // WITHDRAWAL FUNCTIONS
  getWithdraw: async (req, res) => {
    try {
      const userId = req.session.user?._id || req.session.user?.id || req.session.userId;
      
      if (!userId) {
        req.flash('error', 'Please login to withdraw funds');
        return res.redirect('/auth/login');
      }

      const wallets = await Wallet.find({ userId }).lean();
      
      res.render('transactions/withdraw', {
        title: 'Withdraw Funds - QFS',
        wallets,
        error: req.flash('error'),
        success: req.flash('success'),
        formData: req.flash('formData')[0] || {},
        user: req.session.user
      });
    } catch (error) {
      console.error('Withdraw error:', error);
      res.status(500).render('error/500', { 
        title: 'Server Error',
        error: req.app.get('env') === 'development' ? error : {},
        user: req.session.user
      });
    }
  },

  withdraw: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('formData', req.body);
        req.flash('error', errors.array()[0].msg);
        return res.redirect('/transactions/withdraw');
      }

      const { amount, currency, method, bankDetails } = req.body;
      const userId = req.session.user?._id || req.session.user?.id || req.session.userId;

      if (!userId) {
        req.flash('error', 'Please login to withdraw funds');
        return res.redirect('/auth/login');
      }

      const wallet = await Wallet.findOne({ userId, currency });
      if (!wallet) {
        req.flash('formData', req.body);
        req.flash('error', `No ${currency} wallet found`);
        return res.redirect('/transactions/withdraw');
      }

      const amountNum = parseFloat(amount);
      if (wallet.balance < amountNum) {
        req.flash('formData', req.body);
        req.flash('error', 'Insufficient balance');
        return res.redirect('/transactions/withdraw');
      }

      const transaction = new Transaction({
        userId,
        walletId: wallet._id,
        type: 'withdrawal',
        method,
        amount: amountNum,
        currency,
        status: 'pending',
        description: `Withdrawal request - ${method}`,
        metadata: {
          bankDetails: bankDetails,
          processingTime: '3-5 business days'
        }
      });

      await transaction.save();

      req.flash('success', `Withdrawal request for ${currency} ${amount} submitted successfully. It will be processed after admin approval.`);
      res.redirect('/transactions');
      
    } catch (error) {
      console.error('Withdrawal error:', error);
      req.flash('error', 'Failed to process withdrawal request');
      res.redirect('/transactions/withdraw');
    }
  },

  // HELPER FUNCTIONS
  getExchangeRate: async (fromCurrency, toCurrency) => {
    // Simplified exchange rates - in real app, use an external API
    const rates = {
      'USD_EUR': 0.85,
      'USD_GBP': 0.73,
      'USD_CAD': 1.25,
      'EUR_USD': 1.18,
      'GBP_USD': 1.37,
      'CAD_USD': 0.80
    };
    
    const key = `${fromCurrency}_${toCurrency}`;
    return rates[key] || 1; // Default to 1 if rate not found
  },

  // APPROVE PENDING REQUESTS (for admins)
  approveRequest: async (req, res) => {
    try {
      const { transactionId } = req.params;
      const adminId = req.session.user?._id;

      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        req.flash('error', 'Transaction not found');
        return res.redirect('/admin/transactions');
      }

      if (transaction.status !== 'pending') {
        req.flash('error', 'Transaction is not pending approval');
        return res.redirect('/admin/transactions');
      }

      transaction.status = 'completed';
      transaction.metadata.approvedBy = adminId;
      transaction.metadata.approvedAt = new Date();

      await transaction.save();

      req.flash('success', 'Transaction approved successfully');
      res.redirect('/admin/transactions');
      
    } catch (error) {
      console.error('Approve request error:', error);
      req.flash('error', 'Failed to approve transaction');
      res.redirect('/admin/transactions');
    }
  },

  // GET TRANSACTION DETAILS
  getTransactionDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.user?._id;
      const userRole = req.session.user?.role;

      const transaction = await Transaction.findById(id)
        .populate('userId', 'firstName lastName email')
        .populate('recipientId', 'firstName lastName email')
        .populate('senderId', 'firstName lastName email');

      if (!transaction) {
        req.flash('error', 'Transaction not found');
        return res.redirect('/transactions');
      }

      // Check if user has permission to view this transaction
      if (!['admin', 'superadmin'].includes(userRole) && 
          transaction.userId._id.toString() !== userId.toString() && 
          transaction.recipientId?._id.toString() !== userId.toString()) {
        req.flash('error', 'Access denied');
        return res.redirect('/transactions');
      }

      res.render('transactions/details', {
        title: 'Transaction Details - QFS',
        transaction,
        user: req.session.user
      });

    } catch (error) {
      console.error('Transaction details error:', error);
      req.flash('error', 'Failed to load transaction details');
      res.redirect('/transactions');
    }
  }
};

module.exports = transactionController;