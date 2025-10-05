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
      
      console.log('Extracted userId:', userId);
      
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

      const [transactions, total] = await Promise.all([
        Transaction.find({ $or: [{ userId }, { recipientId: userId }] })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'firstName lastName email')
          .populate('recipientId', 'firstName lastName email')
          .populate('senderId', 'firstName lastName email')
          .lean(),
        Transaction.countDocuments({ $or: [{ userId }, { recipientId: userId }] })
      ]);

      console.log(`✅ Found ${transactions.length} transactions out of ${total} total`);

      res.render('transactions', {
        title: 'Transactions - QFS',
        transactions,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        user: req.session.user // Use session user
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

      const { amount, currency, method } = req.body;
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
        description: `Withdrawal request - ${method}`
      });

      await transaction.save();

      req.flash('success', `Withdrawal request for ${currency} ${amount} submitted successfully. It will be processed after admin approval.`);
      res.redirect('/transactions');
      
    } catch (error) {
      console.error('Withdrawal error:', error);
      req.flash('error', 'Failed to process withdrawal request');
      res.redirect('/transactions/withdraw');
    }
  }
};

module.exports = transactionController;