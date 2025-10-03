// src/controllers/depositController.ts
import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';
import { validationResult } from 'express-validator';

// Crypto wallet addresses
const cryptoAddresses = {
  'BTC': 'bc1qnvk84egsa6ztp7talek9ut2qafw8pkcq9vjhsp',
  'XRP': 'rWAf25pP6eY5sDob1NsUNCCLfPDhDFXn3',
  'XLM': 'GBLK5SM3LTSNAL33M6ERXLCG3PQXTEC27BWG3CH2RJKWNHANIHTN4YG2',
  'ETH': '0x38D80d6C99f53935c31A7e30222FEB4C2C3185ae',
  'USDT-ERC20': '0x38D80d6C99f53935c31A7e30222FEB4C2C3185ae',
  'USDT-TRC20': 'TQ7nNiF2w2QzvgU2cQ81zpsMMw9CfCi5sN',
  'ALGO': '47BW32DIJH24TV7ULPCGHMRDWZXKVTENYEW4QJPVELIAULLMNPSUPAHXVA',
  'MATIC': '0x38D80d6C99f53935c31A7e30222FEB4C2C3185ae',
  'LTC': 'ltc1qhnq6kgvcy64tjsxugax8ttw7z87x3tdxel8pxm',
  'DOGE': 'DBeNuV12aj2nNoeUyDiWXf1GDGH74Z1SBx',
  'SOL': 'HhV3ydYWteQGxPPc3Atuj6qL1q4WWL7Ds4ogGxZZZP6n',
  'USDC': '0x38D80d6C99f53935c31A7e30222FEB4C2C3185ae'
};

// Controller for rendering the deposit page
export const getDepositPage = async (req: AuthRequest, res: Response) => {
  try {
    // Get user's wallets to show current balances
    const wallets = await Wallet.find({ user: req.user!._id, isActive: true });
    
    res.render('deposit', {
      user: req.user,
      wallets: wallets,
      cryptoAddresses: cryptoAddresses,
      title: 'Deposit Funds'
    });
  } catch (error) {
    console.error('Get deposit page error:', error);
    res.status(500).render('error', {
      message: 'Internal server error',
      user: req.user
    });
  }
};

// Process deposit submission
export const processDeposit = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { amount, currency, network } = req.body;
    const userId = req.user!._id;

    // Validate wallet exists for the currency
    const wallet = await Wallet.findOne({ 
      user: userId, 
      currency: currency.toUpperCase() 
    });

    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: `No wallet found for ${currency}`
      });
    }

    // Create pending deposit transaction
    const depositTransaction = new Transaction({
      user: userId,
      type: 'deposit',
      amount: parseFloat(amount),
      status: 'pending',
      metadata: {
        currency: currency.toUpperCase(),
        network: network || `${currency.toUpperCase()} Network`,
        walletAddress: cryptoAddresses[currency as keyof typeof cryptoAddresses],
        submittedAt: new Date()
      }
    });

    await depositTransaction.save();

    res.json({
      success: true,
      message: 'Deposit submitted successfully. Please send the funds to the provided address.',
      data: {
        transactionId: depositTransaction._id,
        amount: amount,
        currency: currency,
        walletAddress: cryptoAddresses[currency as keyof typeof cryptoAddresses],
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(cryptoAddresses[currency as keyof typeof cryptoAddresses])}`
      }
    });

  } catch (error) {
    console.error('Process deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Submit payment confirmation
export const submitDepositPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId, amount, currency } = req.body;
    const userId = req.user!._id;

    // Find the transaction
    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: userId,
      type: 'deposit',
      status: 'pending'
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or already processed'
      });
    }

    // Update transaction status to submitted
    transaction.status = 'submitted';
    transaction.metadata = {
      ...transaction.metadata,
      paymentSubmittedAt: new Date(),
      requiresVerification: true
    };

    await transaction.save();

    res.json({
      success: true,
      message: 'Payment submitted successfully. Please contact support for verification.',
      data: {
        transactionId: transaction._id,
        nextStep: 'contact_support'
      }
    });

  } catch (error) {
    console.error('Submit payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};