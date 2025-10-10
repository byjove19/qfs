// controllers/depositController.js
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const { validationResult } = require('express-validator');

const depositController = {

  // Get deposit page
  getDepositPage: async (req, res) => {
    try {
      const userId = req.session.user?._id || req.session.user?.id;
      
      if (!userId) {
        req.flash('error', 'Please login to make a deposit');
        return res.redirect('/auth/login');
      }

      const user = await User.findById(userId).select('firstName lastName email');
      const wallets = await Wallet.find({ userId }).lean();

      res.render('deposit', {
        title: 'Deposit Funds - QFS',
        user: req.session.user,
        currentUser: user,
        wallets,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Get deposit page error:', error);
      res.status(500).render('error/500', { 
        title: 'Server Error',
        error: req.app.get('env') === 'development' ? error : {},
        user: req.session.user
      });
    }
  },

  // NEW METHOD: Handle crypto deposit submissions from the new UI
  submitDepositRequest: async (req, res) => {
    try {
      const { amount, currency, description } = req.body;
      const userId = req.session.user?._id || req.session.user?.id;
      
      // Validate required fields
      if (!amount || !currency) {
        return res.status(400).json({
          success: false,
          message: 'Amount and currency are required'
        });
      }

      // Validate minimum amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum < 100) {
        return res.status(400).json({
          success: false,
          message: 'Minimum deposit amount is $100'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Please login to make a deposit'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Map frontend currency codes to your Wallet model currencies
      const currencyMapping = {
        'BTC': 'BTC',
        'ETH': 'ETH', 
        'LTC': 'LTC',
        'XRP': 'XRP',
        'XLM': 'XLM',
        'STRAWMAN': 'STRAWMAN',
        'USDT-ERC20': 'ETH', // Map to ETH wallet for ERC20 tokens
        'USDT-TRC20': 'XDC', // Map to appropriate wallet
        'ALGO': 'ALGO',
        'MATIC': 'MATIC',
        'SOL': 'XDC', // Map to appropriate wallet
        'USDC': 'ETH' // Map to ETH wallet for ERC20 tokens
      };

      const walletCurrency = currencyMapping[currency] || 'USD';
      
      // Find or create wallet for the currency
      let wallet = await Wallet.findOne({ 
        userId: userId, 
        currency: walletCurrency 
      });

      if (!wallet) {
        try {
          wallet = await Wallet.create({
            userId: userId,
            currency: walletCurrency,
            balance: 0
          });
          console.log('Created new wallet for crypto deposit:', wallet._id);
        } catch (walletError) {
          console.error('Error creating wallet:', walletError);
          return res.status(500).json({
            success: false,
            message: 'Failed to create wallet for selected cryptocurrency'
          });
        }
      }

      // Create pending crypto deposit transaction
      const transaction = new Transaction({
        userId: userId,
        walletId: wallet._id,
        type: 'deposit',
        method: 'crypto',
        amount: amountNum,
        currency: walletCurrency,
        status: 'pending',
        description: description || `Crypto deposit request for $${amount} via ${currency}`,
        metadata: {
          cryptoCurrency: currency,
          originalAmountUSD: amountNum,
          paymentMethod: 'crypto_wallet',
          userNotes: 'Awaiting crypto transfer and verification',
          requiresAdminApproval: true,
          adminAttentionRequired: true,
          submittedAt: new Date(),
          depositType: 'crypto',
          expectedAmount: amountNum,
          // Store the actual crypto address for reference
          cryptoAddress: getCryptoAddress(currency)
        }
      });

      await transaction.save();

      // Update wallet's last action
      wallet.lastAction = {
        amount: amountNum,
        type: 'crypto_deposit_request',
        date: new Date()
      };
      await wallet.save();

      // Send notification to admin
      await notifyAdminsAboutDeposit(transaction);

      console.log(`✅ New crypto deposit request: User ${userId}, Amount: $${amount}, Crypto: ${currency}`);

      return res.json({
        success: true,
        message: 'Crypto deposit request submitted successfully. Please send the cryptocurrency to the provided address and contact support for verification.',
        transaction: {
          _id: transaction._id,
          transactionId: `TX${transaction._id.toString().substring(0, 8).toUpperCase()}`,
          amount: transaction.amount,
          currency: transaction.currency,
          cryptoCurrency: currency,
          status: transaction.status,
          createdAt: transaction.createdAt,
          walletId: wallet._id
        }
      });

    } catch (error) {
      console.error('Submit deposit request error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit deposit request. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Process deposit request (your existing method)
  processDeposit: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg
        });
      }

      const { currency, amount, paymentMethod, description, userNotes, transactionId } = req.body;
      const userId = req.session.user?._id || req.session.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Please login to make a deposit'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Validate amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }

      // Check if currency is valid (match with Wallet model)
      const validCurrencies = ['USD', 'BTC', 'ETH', 'LTC', 'XRP', 'STRAWMAN', 'XDC', 'XLM', 'MATIC', 'ALGO'];
      if (!validCurrencies.includes(currency)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid currency selected'
        });
      }

      // Check payment method
      const validMethods = ['manual', 'bank'];
      if (!validMethods.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment method'
        });
      }

      // Find or create wallet for the currency
      let wallet = await Wallet.findOne({ 
        userId: userId, 
        currency: currency 
      });

      if (!wallet) {
        // Create wallet if it doesn't exist
        try {
          wallet = await Wallet.create({
            userId: userId,
            currency: currency,
            balance: 0
          });
          console.log('Created new wallet for deposit:', wallet._id);
        } catch (walletError) {
          console.error('Error creating wallet:', walletError);
          return res.status(500).json({
            success: false,
            message: 'Failed to create wallet for selected currency'
          });
        }
      }

      // Handle file upload if provided
      let fileProof = null;
      if (req.file) {
        fileProof = `/uploads/deposits/${req.file.filename}`;
      }

      // Create pending deposit transaction WITH walletId
      const transaction = new Transaction({
        userId: userId,
        walletId: wallet._id, // ADD THIS - CRITICAL FIX
        type: 'deposit',
        method: paymentMethod,
        amount: amountNum,
        currency: currency,
        status: 'pending',
        description: description || `Deposit request via ${paymentMethod}`,
        metadata: {
          paymentMethod: paymentMethod,
          fileProof: fileProof,
          userNotes: userNotes,
          requiresAdminApproval: true,
          submittedAt: new Date(),
          transactionId: transactionId
        }
      });

      await transaction.save();

      // Update wallet's last action
      wallet.lastAction = {
        amount: amountNum,
        type: 'deposit_request',
        date: new Date()
      };
      await wallet.save();

      // Send notification to admin
      await notifyAdminsAboutDeposit(transaction);

      return res.json({
        success: true,
        message: 'Deposit request submitted successfully. It will be processed after admin approval.',
        data: {
          transactionId: transaction._id,
          walletId: wallet._id,
          amount: amountNum,
          currency: currency,
          status: 'pending'
        }
      });

    } catch (error) {
      console.error('Process deposit error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process deposit request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // Get user's deposit history
  getDepositHistory: async (req, res) => {
    try {
      const userId = req.session.user?._id || req.session.user?.id;
      const userRole = req.session.user?.role;
      
      if (!userId) {
        req.flash('error', 'Please login to view deposit history');
        return res.redirect('/auth/login');
      }

      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      let query = { type: 'deposit' };
      
      // Regular users only see their own deposits
      if (!['admin', 'superadmin'].includes(userRole)) {
        query.userId = userId;
      }

      const [deposits, total] = await Promise.all([
        Transaction.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'firstName lastName email')
          .populate('walletId', 'currency') // Populate wallet info
          .lean(),
        Transaction.countDocuments(query)
      ]);

      res.render('transactions/deposit-history', {
        title: 'Deposit History - QFS',
        deposits,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        isAdmin: ['admin', 'superadmin'].includes(userRole),
        user: req.session.user,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Get deposit history error:', error);
      res.status(500).render('error/500', { 
        title: 'Server Error',
        error: req.app.get('env') === 'development' ? error : {},
        user: req.session.user
      });
    }
  },

  // Get deposit details
  getDepositDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.user?._id;
      const userRole = req.session.user?.role;

      const deposit = await Transaction.findById(id)
        .populate('userId', 'firstName lastName email phone')
        .populate('walletId', 'currency balance') // Populate wallet info
        .populate('recipientId', 'firstName lastName email');

      if (!deposit) {
        req.flash('error', 'Deposit not found');
        return res.redirect('/deposit/history');
      }

      // Check permissions
      if (!['admin', 'superadmin'].includes(userRole) && 
          deposit.userId._id.toString() !== userId.toString()) {
        req.flash('error', 'Access denied');
        return res.redirect('/deposit/history');
      }

      res.render('transactions/deposit-details', {
        title: 'Deposit Details - QFS',
        deposit,
        isAdmin: ['admin', 'superadmin'].includes(userRole),
        user: req.session.user
      });
    } catch (error) {
      console.error('Get deposit details error:', error);
      req.flash('error', 'Failed to load deposit details');
      res.redirect('/deposit/history');
    }
  }
};

// Helper function to get crypto addresses
function getCryptoAddress(currency) {
  const addresses = {
    'BTC': 'bc1qnvk84egsa6ztp7talek9ut2qafw8pkcq9vjhsp',
    'ETH': '0x38D80d6C99f53935c31A7e30222FEB4C2C3185ae',
    'LTC': 'ltc1qhnq6kgvcy64tjsxugax8ttw7z87x3tdxel8pxm',
    'XRP': 'rWAf25pP6eY5sDob1NsUNCCLfPDhDFXn3',
    'XLM': 'GBLK5SM3LTSNAL33M6ERXLCG3PQXTEC27BWG3CH2RJKWNHANIHTN4YG2',
    'STRAWMAN': 'DBeNuV12aj2nNoeUyDiWXf1GDGH74Z1SBx',
    'USDT-ERC20': '0x38D80d6C99f53935c31A7e30222FEB4C2C3185ae',
    'USDT-TRC20': 'TQ7nNiF2w2QzvgU2cQ81zpsMMw9CfCi5sN',
    'ALGO': '47BW32DIJH24TV7ULPCGHMRDWZXKVTENYEW4QJPVELIAULLMNPSUPAHXVA',
    'MATIC': '0x38D80d6C99f53935c31A7e30222FEB4C2C3185ae',
    'SOL': 'HhV3ydYWteQGxPPc3Atuj6qL1q4WWL7Ds4ogGxZZZP6n',
    'USDC': '0x38D80d6C99f53935c31A7e30222FEB4C2C3185ae'
  };
  return addresses[currency] || 'Address not configured';
}

// Helper function to notify admins about new deposit
async function notifyAdminsAboutDeposit(deposit) {
  try {
    const admins = await User.find({ 
      role: { $in: ['admin', 'superadmin'] } 
    }).select('email firstName');
    
    console.log(`📢 New deposit request from user ${deposit.userId}: ${deposit.amount} ${deposit.currency}`);
    console.log(`👥 Notifying admins:`, admins.map(admin => admin.email));
    
    // Here you can implement email, push, or database notifications
    
  } catch (error) {
    console.error('Notify admins error:', error);
  }
}

module.exports = depositController;