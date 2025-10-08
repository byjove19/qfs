const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const CardRequest = require('../models/CardRequest');

const transactionController = {
   getTransactions: async (req, res) => {
    try {
      // Get user info from session
      const userId = req.session.user?._id || req.session.user?.id;
      const userRole = req.session.user?.role || 'user';
      const userEmail = req.session.user?.email || '';

      if (!userId) {
        req.flash('error', 'Please login to view transactions');
        return res.redirect('/auth/login');
      }

      // Pagination
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      // Build query based on user role
      let query = {};
      
      if (['admin', 'superadmin'].includes(userRole)) {
        // Admins see all transactions
        query = {};
      } else {
        // Regular users see only their transactions
        query = {
          $or: [
            { userId }, 
            { recipientId: userId }
          ]
        };
      }

      // Execute queries
      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'firstName lastName email')
          .populate('recipientId', 'firstName lastName email')
          .lean(),
        Transaction.countDocuments(query)
      ]);

      // Render page with all required data
      res.render('transactions', {
        title: 'Transactions - QFS',
        transactions: transactions || [],
        currentPage: page,
        totalPages: Math.ceil(total / limit) || 1,
        user: req.session.user,
        userEmail: userEmail, // This fixes the template error
        isAdmin: ['admin', 'superadmin'].includes(userRole),
        hasTransactions: transactions && transactions.length > 0
      });

    } catch (error) {
      console.error('Transactions error:', error);
      res.status(500).render('error/500', {
        title: 'Server Error',
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

// In your transactionController.js - update the getSendMoney function:

getSendMoney: async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user?.id || req.session.userId;
    
    if (!userId) {
      req.flash('error', 'Please login to send money');
      return res.redirect('/auth/login');
    }

    console.log('Fetching wallets for user:', userId);

    // Fetch wallets using the same logic as wallet controller
    const wallets = await Wallet.find({ userId }).lean();
    
    console.log('Found wallets:', wallets.map(w => ({ currency: w.currency, balance: w.balance })));

    // If no wallets found, redirect to wallet page to create them
    if (!wallets || wallets.length === 0) {
      req.flash('error', 'No wallets found. Please create a wallet first.');
      return res.redirect('/wallet');
    }

    res.render('transactions/send', {
      title: 'Send Money - QFS',
      wallets: wallets, // Pass the actual wallet objects
      error: req.flash('error'),
      success: req.flash('success'),
      formData: req.flash('formData')[0] || {},
      user: req.session.user
    });
  } catch (error) {
    console.error('Send money page error:', error);
    res.status(500).render('error/500', { 
      title: 'Server Error',
      error: req.app.get('env') === 'development' ? error : {},
      user: req.session.user
    });
  }
},

// Also update the sendMoney function to handle uppercase currencies:
sendMoney: async (req, res) => {
  try {
    const { recipientEmail, amount, currency, description } = req.body;
    const senderId = req.session.user?._id || req.session.user?.id || req.session.userId;

    if (!senderId) {
      req.flash('error', 'Please login to send money');
      return res.redirect('/auth/login');
    }

    console.log('Send money request:', { recipientEmail, amount, currency, senderId });

    // Find recipient by email
    const recipient = await User.findOne({ email: recipientEmail.toLowerCase() });
    if (!recipient) {
      req.flash('formData', req.body);
      req.flash('error', 'Recipient not found in our system');
      return res.redirect('/transactions/send');
    }

    // Check if sending to self
    if (recipient._id.toString() === senderId.toString()) {
      req.flash('formData', req.body);
      req.flash('error', 'Cannot send money to yourself');
      return res.redirect('/transactions/send');
    }

    // Find sender's wallet - ensure currency matches your wallet format (uppercase)
    const senderWallet = await Wallet.findOne({ 
      userId: senderId, 
      currency: currency.toUpperCase() // Convert to uppercase to match wallet format
    });
    
    console.log('Sender wallet found:', senderWallet);
    
    if (!senderWallet) {
      req.flash('formData', req.body);
      req.flash('error', `No ${currency} wallet found. Please check your wallet balance.`);
      return res.redirect('/transactions/send');
    }

    const amountNum = parseFloat(amount);
    if (senderWallet.balance < amountNum) {
      req.flash('formData', req.body);
      req.flash('error', 'Insufficient balance');
      return res.redirect('/transactions/send');
    }

    // Create pending transaction (requires admin approval)
    const transaction = new Transaction({
      userId: senderId,
      walletId: senderWallet._id,
      type: 'send',
      method: 'manual',
      amount: amountNum,
      currency: currency.toUpperCase(), // Store as uppercase
      status: 'pending', // This requires admin approval
      description: description || `Payment to ${recipientEmail}`,
      recipientId: recipient._id,
      metadata: {
        requiresApproval: true,
        approvalType: 'send_money',
        senderWalletBalance: senderWallet.balance,
        recipientEmail: recipientEmail,
        originalBalance: senderWallet.balance,
        currency: currency.toUpperCase() // Store as uppercase
      }
    });

    await transaction.save();

    console.log('Transaction created successfully:', transaction._id);

    // User-friendly success message
    req.flash('success', `Money sent successfully! ${currency} ${amount} has been sent to ${recipientEmail}.`);
    res.redirect('/transactions');
    
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
      const user = await User.findById(userId).select('firstName lastName email');
      
      res.render('virtual', {
        title: 'Virtual Cards - QFS',
        wallets,
        user: req.session.user,
        userData: user,
        messages: {
          error: req.flash('error'),
          success: req.flash('success')
        }
      });
    } catch (error) {
      console.error('Request card page error:', error);
      req.flash('error', 'Failed to load card request page');
      res.redirect('/dashboard');
    }
  },

  requestCard: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { cardType, currency, amount } = req.body;
      const userId = req.session.user?._id || req.session.user?.id || req.session.userId;

      console.log('Card request received:', { cardType, currency, amount, userId });

      // Validation
      if (!cardType || !currency || !amount) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount < 10) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Minimum amount is $10.00'
        });
      }

      // Get user details
      const user = await User.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      console.log('User found:', user.email);

      // Check wallet balance
      const wallet = await Wallet.findOne({ userId, currency }).session(session);
      if (!wallet) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `No ${currency} wallet found`
        });
      }

      console.log('Wallet found - Balance:', wallet.balance, 'Currency:', wallet.currency);

      const issuanceFee = 10.00;
      const totalAmount = numericAmount + issuanceFee;

      if (wallet.balance < totalAmount) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Insufficient balance. Required: ${totalAmount} ${currency}, Available: ${wallet.balance} ${currency}`
        });
      }

      // Deduct amount from wallet
      wallet.balance -= totalAmount;
      wallet.lastAction = new Date();
      await wallet.save({ session });

      console.log('Wallet updated - New balance:', wallet.balance);

      // Create card request
      const cardRequest = new CardRequest({
        userId,
        cardType,
        currency,
        amount: numericAmount,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        issuanceFee,
        totalAmount,
        paymentStatus: 'completed'
      });

      await cardRequest.save({ session });
      console.log('Card request created:', cardRequest._id);

      // Create transaction record
      const transaction = new Transaction({
        userId,
        type: 'card_request',
        method: 'system',
        amount: totalAmount,
        currency,
        status: 'completed',
        description: `${cardType.toUpperCase()} Virtual Card Request`,
        metadata: {
          cardRequestId: cardRequest._id,
          cardType: cardType,
          preloadAmount: numericAmount,
          issuanceFee: issuanceFee,
          requestType: 'virtual_card'
        }
      });

      await transaction.save({ session });
      console.log('Transaction created:', transaction._id);

      await session.commitTransaction();
      session.endSession();

      console.log('Card request completed successfully');

      res.json({
        success: true,
        message: 'Card request submitted successfully! It will be processed within 24-48 hours.',
        data: {
          requestId: cardRequest._id,
          cardType: cardType,
          amount: numericAmount,
          currency: currency,
          totalPaid: totalAmount
        }
      });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Card request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process card request: ' + error.message
      });
    }
  },

  // Get user's card requests
  getUserCardRequests: async (req, res) => {
    try {
      const userId = req.session.user?._id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [cardRequests, totalRequests] = await Promise.all([
        CardRequest.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        CardRequest.countDocuments({ userId })
      ]);

      res.render('user-card-requests', {
        title: 'My Card Requests - QFS',
        cardRequests,
        currentPage: page,
        totalPages: Math.ceil(totalRequests / limit),
        totalRequests,
        user: req.session.user,
        messages: {
          error: req.flash('error'),
          success: req.flash('success')
        }
      });
    } catch (error) {
      console.error('Get user card requests error:', error);
      req.flash('error', 'Failed to load card requests');
      res.redirect('/dashboard');
    }
  },


  // Get all card requests for admin
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

      // Stats
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

  // Get single card request details
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

  // Approve card request
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

      // Update card request
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

      // Create system transaction for card issuance
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

  // Reject card request
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

      // Refund the amount
      const wallet = await Wallet.findOne({ 
        userId: cardRequest.userId, 
        currency: cardRequest.currency 
      }).session(session);

      if (wallet) {
        wallet.balance += cardRequest.totalAmount;
        wallet.lastAction = new Date();
        await wallet.save({ session });
      }

      // Update card request
      cardRequest.status = 'rejected';
      cardRequest.rejectionReason = rejectionReason;
      cardRequest.processedBy = req.session.user._id;
      cardRequest.processedAt = new Date();
      cardRequest.rejectedAt = new Date();
      cardRequest.paymentStatus = 'refunded';

      await cardRequest.save({ session });

      // Create refund transaction
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

  // NEW WITHDRAWAL PAGE CONTROLLERS
  getWithdrawalList: async (req, res) => {
    try {
      const userId = req.session.user?._id || req.session.user?.id || req.session.userId;
      const userRole = req.session.user?.role;
      
      if (!userId) {
        req.flash('error', 'Please login to view withdrawals');
        return res.redirect('/auth/login');
      }

      let query = { type: 'withdrawal' };
      
      // Regular users only see their own withdrawals
      if (!['admin', 'superadmin'].includes(userRole)) {
        query.userId = userId;
      }

      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      const [withdrawals, total] = await Promise.all([
        Transaction.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'firstName lastName email')
          .lean(),
        Transaction.countDocuments(query)
      ]);

      res.render('transactions/withdrawal-list', {
        title: 'Withdrawal History - QFS',
        withdrawals,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        isAdmin: ['admin', 'superadmin'].includes(userRole),
        user: req.session.user,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Withdrawal list error:', error);
      res.status(500).render('error/500', { 
        title: 'Server Error',
        error: req.app.get('env') === 'development' ? error : {},
        user: req.session.user
      });
    }
  },

  getWithdrawalSettings: async (req, res) => {
    try {
      // This is admin-only (protected by isAdmin middleware)
      res.render('transactions/withdrawal-settings', {
        title: 'Withdrawal Settings - QFS',
        user: req.session.user,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Withdrawal settings error:', error);
      res.status(500).render('error/500', { 
        title: 'Server Error',
        error: req.app.get('env') === 'development' ? error : {},
        user: req.session.user
      });
    }
  },

  getWithdrawalDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.user?._id;
      const userRole = req.session.user?.role;

      const withdrawal = await Transaction.findById(id)
        .populate('userId', 'firstName lastName email phone')
        .populate('recipientId', 'firstName lastName email');

      if (!withdrawal) {
        req.flash('error', 'Withdrawal not found');
        return res.redirect('/transactions/withdrawal-list');
      }

      // Check permissions
      if (!['admin', 'superadmin'].includes(userRole) && 
          withdrawal.userId._id.toString() !== userId.toString()) {
        req.flash('error', 'Access denied');
        return res.redirect('/transactions/withdrawal-list');
      }

      res.render('transactions/withdrawal-details', {
        title: 'Withdrawal Details - QFS',
        withdrawal,
        isAdmin: ['admin', 'superadmin'].includes(userRole),
        user: req.session.user
      });
    } catch (error) {
      console.error('Withdrawal details error:', error);
      req.flash('error', 'Failed to load withdrawal details');
      res.redirect('/transactions/withdrawal-list');
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
  },

  // PRINT TRANSACTION FUNCTION
  printTransaction: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.user?._id || req.session.user?.id || req.session.userId;
      const userRole = req.session.user?.role;

      console.log('=== PRINT TRANSACTION REQUEST ===');
      console.log('Transaction ID:', id);
      console.log('User ID:', userId);
      console.log('User Role:', userRole);

      if (!userId) {
        req.flash('error', 'Please login to print transaction');
        return res.redirect('/auth/login');
      }

      // Find transaction with detailed population
      const transaction = await Transaction.findById(id)
        .populate('userId', 'firstName lastName email phone address')
        .populate('recipientId', 'firstName lastName email phone')
        .populate('senderId', 'firstName lastName email phone');

      if (!transaction) {
        req.flash('error', 'Transaction not found');
        return res.redirect('/transactions');
      }

      // Check if user has permission to view this transaction
      const isUserInvolved = 
        transaction.userId?._id?.toString() === userId.toString() ||
        transaction.recipientId?._id?.toString() === userId.toString() ||
        transaction.senderId?._id?.toString() === userId.toString();

      if (!['admin', 'superadmin'].includes(userRole) && !isUserInvolved) {
        req.flash('error', 'Access denied to view this transaction');
        return res.redirect('/transactions');
      }

      // Get current user info for the receipt
      const currentUser = await User.findById(userId).select('firstName lastName email phone address');

      // Prepare transaction data for printing
      const printData = {
        transaction: {
          _id: transaction._id,
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          method: transaction.method,
          description: transaction.description,
          fee: transaction.fee || 0,
          totalAmount: transaction.amount + (transaction.fee || 0),
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        },
        user: {
          firstName: currentUser?.firstName || 'User',
          lastName: currentUser?.lastName || '',
          email: currentUser?.email || '',
          phone: currentUser?.phone || 'Not provided',
          address: currentUser?.address || 'Not provided'
        },
        counterparty: {},
        company: {
          name: 'QFS Financial Services',
          address: '123 Financial District, Lagos, Nigeria',
          phone: '+234-800-QFS-BANK',
          email: 'support@qfs.com',
          website: 'www.qfs.com'
        }
      };

      // Determine counterparty based on transaction type
      if (transaction.type === 'send' && transaction.recipientId) {
        printData.counterparty = {
          name: `${transaction.recipientId.firstName} ${transaction.recipientId.lastName}`,
          email: transaction.recipientId.email,
          phone: transaction.recipientId.phone || 'Not provided',
          role: 'Recipient'
        };
      } else if (transaction.type === 'receive' && transaction.userId) {
        printData.counterparty = {
          name: `${transaction.userId.firstName} ${transaction.userId.lastName}`,
          email: transaction.userId.email,
          phone: transaction.userId.phone || 'Not provided',
          role: 'Sender'
        };
      } else if (transaction.type === 'request' && transaction.recipientId) {
        printData.counterparty = {
          name: `${transaction.recipientId.firstName} ${transaction.recipientId.lastName}`,
          email: transaction.recipientId.email,
          phone: transaction.recipientId.phone || 'Not provided',
          role: 'Requested From'
        };
      } else {
        printData.counterparty = {
          name: 'System',
          email: 'system@qfs.com',
          phone: 'N/A',
          role: 'System'
        };
      }

      // Add metadata if available
      if (transaction.metadata) {
        printData.metadata = transaction.metadata;
      }

      console.log('✅ Printing transaction:', printData.transaction._id);

      // Render print template
      res.render('transactions/print', {
        title: `Transaction Receipt - ${transaction._id}`,
        ...printData,
        layout: 'print-layout', // You might want a special layout for printing
        user: req.session.user
      });

    } catch (error) {
      console.error('❌ Print transaction error:', error);
      req.flash('error', 'Failed to generate transaction receipt');
      res.redirect('/transactions');
    }
  },

  // API endpoint for filtering transactions
  filterTransactions: async (req, res) => {
    try {
      const { type, status, wallet, from, to, page = 1, limit = 10 } = req.query;
      const userId = req.session.user?._id || req.session.user?.id || req.session.userId;
      const userRole = req.session.user?.role;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Build query based on user role
      let filter = {};
      
      if (['admin', 'superadmin'].includes(userRole)) {
        // Admins can see all transactions
        filter = {};
      } else {
        // Regular users see their own transactions
        filter = {
          $or: [
            { userId }, 
            { recipientId: userId },
            { 
              $and: [
                { $or: [{ userId }, { recipientId: userId }] },
                { status: { $in: ['completed', 'approved'] } }
              ]
            }
          ]
        };
      }
      
      // Apply filters
      if (type && type !== 'all') {
        filter.type = type;
      }
      
      if (status && status !== 'all') {
        filter.status = status;
      }
      
      if (wallet && wallet !== 'all') {
        filter.currency = wallet;
      }
      
      // Date range filter
      if (from && to) {
        filter.createdAt = {
          $gte: new Date(from),
          $lte: new Date(to + 'T23:59:59.999Z') // Include entire end day
        };
      }
      
      const transactions = await Transaction.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('recipientId', 'firstName lastName email')
        .populate('userId', 'firstName lastName email');
        
      const totalCount = await Transaction.countDocuments(filter);
      
      res.json({
        success: true,
        data: {
          transactions,
          totalCount,
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(totalCount / limit),
            hasMore: parseInt(page) < Math.ceil(totalCount / limit)
          }
        }
      });
      
    } catch (error) {
      console.error('Filter error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to filter transactions'
      });
    }
  },

  // API endpoint for loading transactions (for AJAX)
  getTransactionsAPI: async (req, res) => {
    try {
      console.log('=== TRANSACTIONS API REQUEST ===');
      
      const userId = req.session.user?._id || req.session.user?.id || req.session.userId;
      const userRole = req.session.user?.role;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Build query based on user role
      let query = {};
      
      if (['admin', 'superadmin'].includes(userRole)) {
        query = {};
      } else {
        query = {
          $or: [
            { userId }, 
            { recipientId: userId },
            { 
              $and: [
                { $or: [{ userId }, { recipientId: userId }] },
                { status: { $in: ['completed', 'approved'] } }
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

      console.log(`✅ API: Found ${transactions.length} transactions`);

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
            hasMore: page < Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Transactions API error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load transactions'
      });
    }
  },

  // SEND MONEY WITH ADMIN APPROVAL FUNCTION
sendMoneyWithApproval: async (req, res) => {
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

    // Create pending transaction (requires admin approval)
    const transaction = new Transaction({
      userId: senderId,
      walletId: senderWallet._id,
      type: 'send',
      method: 'manual',
      amount: amountNum,
      currency,
      status: 'pending', // Changed to pending for admin approval
      description: description || `Payment to ${recipientEmail}`,
      recipientId: recipient._id,
      metadata: {
        requiresApproval: true,
        approvalType: 'send_money',
        senderWalletBalance: senderWallet.balance,
        recipientEmail: recipientEmail,
        originalBalance: senderWallet.balance
      }
    });

    await transaction.save();

    req.flash('success', `Money transfer request for ${currency} ${amount} to ${recipientEmail} submitted successfully. Waiting for admin approval.`);
    res.redirect('/transactions');
    
  } catch (error) {
    console.error('Send money with approval error:', error);
    req.flash('error', 'Failed to send money request. Please try again.');
    res.redirect('/transactions/send');
  }
},

// APPROVE SEND MONEY REQUEST (Admin function)
approveSendMoney: async (req, res) => {
  try {
    const { transactionId } = req.params;
    const adminId = req.session.user?._id;

    if (!['admin', 'superadmin'].includes(req.session.user?.role)) {
      req.flash('error', 'Admin privileges required');
      return res.redirect('/transactions');
    }

    const session = await Transaction.startSession();
    session.startTransaction();

    try {
      const transaction = await Transaction.findById(transactionId).session(session);
      if (!transaction) {
        req.flash('error', 'Transaction not found');
        return res.redirect('/admin/transactions');
      }

      if (transaction.status !== 'pending') {
        req.flash('error', 'Transaction is not pending approval');
        return res.redirect('/admin/transactions');
      }

      // Find sender's wallet
      const senderWallet = await Wallet.findOne({ 
        userId: transaction.userId, 
        currency: transaction.currency 
      }).session(session);
      
      if (!senderWallet) {
        req.flash('error', 'Sender wallet not found');
        await session.abortTransaction();
        return res.redirect('/admin/transactions');
      }

      // Check if sender still has sufficient balance
      if (senderWallet.balance < transaction.amount) {
        req.flash('error', 'Sender has insufficient balance');
        await session.abortTransaction();
        return res.redirect('/admin/transactions');
      }

      // Find or create recipient's wallet
      let recipientWallet = await Wallet.findOne({ 
        userId: transaction.recipientId, 
        currency: transaction.currency 
      }).session(session);
      
      if (!recipientWallet) {
        recipientWallet = new Wallet({
          userId: transaction.recipientId,
          currency: transaction.currency,
          balance: 0
        });
      }

      // Update balances
      senderWallet.balance -= transaction.amount;
      recipientWallet.balance += transaction.amount;

      // Update transaction status
      transaction.status = 'completed';
      transaction.metadata.approvedBy = adminId;
      transaction.metadata.approvedAt = new Date();
      transaction.metadata.finalSenderBalance = senderWallet.balance;
      transaction.metadata.finalRecipientBalance = recipientWallet.balance;

      await transaction.save({ session });
      await senderWallet.save({ session });
      await recipientWallet.save({ session });

      await session.commitTransaction();
      
      req.flash('success', 'Money transfer approved successfully');
      res.redirect('/admin/transactions');
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Approve send money error:', error);
    req.flash('error', 'Failed to approve money transfer');
    res.redirect('/admin/transactions');
  }
},

// REJECT SEND MONEY REQUEST (Admin function)
rejectSendMoney: async (req, res) => {
  try {
    const { transactionId } = req.params;
    const adminId = req.session.user?._id;

    if (!['admin', 'superadmin'].includes(req.session.user?.role)) {
      req.flash('error', 'Admin privileges required');
      return res.redirect('/transactions');
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      req.flash('error', 'Transaction not found');
      return res.redirect('/admin/transactions');
    }

    if (transaction.status !== 'pending') {
      req.flash('error', 'Transaction is not pending approval');
      return res.redirect('/admin/transactions');
    }

    transaction.status = 'rejected';
    transaction.metadata.rejectedBy = adminId;
    transaction.metadata.rejectedAt = new Date();
    transaction.metadata.rejectionReason = req.body.rejectionReason || 'No reason provided';

    await transaction.save();

    req.flash('success', 'Money transfer request rejected');
    res.redirect('/admin/transactions');
    
  } catch (error) {
    console.error('Reject send money error:', error);
    req.flash('error', 'Failed to reject money transfer');
    res.redirect('/admin/transactions');
  }
}
};


module.exports = transactionController;