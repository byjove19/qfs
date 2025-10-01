// src/controllers/transactionController.ts
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middlewares/authMiddleware';
import Transaction, { ITransaction } from '../models/Transaction';
import Wallet from '../models/Wallet';
import User from '../models/User';
import currencyConverter from '../utils/currencyCoverter';
import feeCalculator from '../utils/feeCalculator';
import mailer from '../utils/mailer';

export const sendMoney = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { recipientEmail, amount, description } = req.body;

    // Find recipient
    const recipient = await User.findOne({ email: recipientEmail, isVerified: true });
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found or not verified'
      });
    }

    if ((recipient._id as any).toString() === (req.user as { _id: any })._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send money to yourself'
      });
    }

    // Get sender's wallet
    const senderWallet = await Wallet.findOne({ user: req.user!._id });
    if (!senderWallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    // Calculate fee and net amount
    const fee = feeCalculator.calculateFee(amount, 'send');
    const totalAmount = amount + fee;

    // Check balance
    if (senderWallet.balance < totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Get recipient's wallet
    const recipientWallet = await Wallet.findOne({ user: recipient._id });
    if (!recipientWallet) {
      return res.status(404).json({
        success: false,
        message: 'Recipient wallet not found'
      });
    }

    // Start transaction
    const session = await Transaction.startSession();
    session.startTransaction();

    try {
      // Update sender's balance
      senderWallet.balance -= totalAmount;
      senderWallet.lastTransactionDate = new Date();
      await senderWallet.save({ session });

      // Update recipient's balance
      recipientWallet.balance += amount;
      recipientWallet.lastTransactionDate = new Date();
      await recipientWallet.save({ session });

      // Create sender transaction
      const senderTransaction = new Transaction({
        referenceId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        user: req.user!._id,
        wallet: senderWallet._id,
        type: 'send',
        amount: -amount,
        currency: senderWallet.currency,
        fee,
        netAmount: -totalAmount,
        status: 'completed',
        description: `Send money to ${recipient.email}: ${description}`,
        metadata: {
          recipient: recipient._id
        }
      });
      await senderTransaction.save({ session });

      // Create recipient transaction
      const recipientTransaction = new Transaction({
        referenceId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        user: recipient._id,
        wallet: recipientWallet._id,
        type: 'send',
        amount,
        currency: recipientWallet.currency,
        fee: 0,
        netAmount: amount,
        status: 'completed',
        description: `Received from ${req.user!.email}: ${description}`,
        metadata: {
          sender: req.user!._id
        }
      });
      await recipientTransaction.save({ session });

      await session.commitTransaction();
      session.endSession();

      // Send notifications
      await mailer.sendTransactionNotification(
        req.user!.email,
        senderTransaction,
        req.user!.firstName
      );

      await mailer.sendTransactionNotification(
        recipient.email,
        recipientTransaction,
        recipient.firstName
      );

      res.json({
        success: true,
        message: 'Money sent successfully',
        data: {
          transaction: senderTransaction,
          fee,
          newBalance: senderWallet.balance
        }
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Send money error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    
    const filter: any = { user: req.user!._id };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('metadata.recipient', 'firstName lastName email')
      .populate('metadata.sender', 'firstName lastName email');

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOne({
      _id: id,
      user: req.user!._id
    })
    .populate('metadata.recipient', 'firstName lastName email')
    .populate('metadata.sender', 'firstName lastName email');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};