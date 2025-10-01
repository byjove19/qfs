// src/controllers/investmentController.ts
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middlewares/authMiddleware';
import Investment, { IInvestment } from '../models/Investment';
import Transaction from '../models/Transaction';
import Wallet from '../models/Wallet';
import feeCalculator from '../utils/feeCalculator';

export const getInvestmentPlans = async (req: AuthRequest, res: Response) => {
  try {
    const plans = [
      {
        name: 'basic',
        minAmount: 100,
        maxAmount: 1000,
        duration: 30,
        expectedReturn: 5, // 5% return
        description: 'Basic investment plan for beginners'
      },
      {
        name: 'premium',
        minAmount: 1000,
        maxAmount: 10000,
        duration: 60,
        expectedReturn: 8, // 8% return
        description: 'Premium plan for experienced investors'
      },
      {
        name: 'vip',
        minAmount: 10000,
        maxAmount: 50000,
        duration: 90,
        expectedReturn: 12, // 12% return
        description: 'VIP plan for high-net-worth individuals'
      }
    ];

    res.json({
      success: true,
      data: { plans }
    });
  } catch (error) {
    console.error('Get investment plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const createInvestment = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { plan, amount } = req.body;

    // Get investment plans to validate
    const plans = [
      { name: 'basic', min: 100, max: 1000, duration: 30, return: 5 },
      { name: 'premium', min: 1000, max: 10000, duration: 60, return: 8 },
      { name: 'vip', min: 10000, max: 50000, duration: 90, return: 12 }
    ];

    const selectedPlan = plans.find(p => p.name === plan);
    if (!selectedPlan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid investment plan'
      });
    }

    // Validate amount
    if (amount < selectedPlan.min || amount > selectedPlan.max) {
      return res.status(400).json({
        success: false,
        message: `Amount must be between ${selectedPlan.min} and ${selectedPlan.max} for ${plan} plan`
      });
    }

    // Check wallet balance
    const wallet = await Wallet.findOne({ user: req.user!._id });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Start transaction
    const session = await Investment.startSession();
    session.startTransaction();

    try {
      // Deduct amount from wallet
      wallet.balance -= amount;
      wallet.lastTransactionDate = new Date();
      await wallet.save({ session });

      // Create transaction record
      const transaction = new Transaction({
        referenceId: `INV${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        user: req.user!._id,
        wallet: wallet._id,
        type: 'withdrawal',
        amount: -amount,
        currency: wallet.currency,
        fee: 0,
        netAmount: -amount,
        status: 'completed',
        description: `Investment in ${plan} plan`
      });
      await transaction.save({ session });

      // Calculate expected return
      const expectedReturn = amount * (selectedPlan.return / 100);
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + selectedPlan.duration);

      // Create investment
      const investment = new Investment({
        user: req.user!._id,
        transaction: transaction._id,
        plan,
        amount,
        currency: wallet.currency,
        expectedReturn,
        duration: selectedPlan.duration,
        startDate,
        endDate,
        status: 'active'
      });
      await investment.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        success: true,
        message: 'Investment created successfully',
        data: { investment }
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Create investment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getInvestments = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    const filter: any = { user: req.user!._id };
    if (status) filter.status = status;

    const investments = await Investment.find(filter)
      .populate('transaction')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Investment.countDocuments(filter);

    // Calculate total stats
    const stats = await Investment.aggregate([
      { $match: { user: req.user!._id } },
      {
        $group: {
          _id: null,
          totalInvested: { $sum: '$amount' },
          totalReturn: { $sum: '$actualReturn' },
          activeInvestments: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        investments,
        stats: stats[0] || { totalInvested: 0, totalReturn: 0, activeInvestments: 0 },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get investments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getInvestment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const investment = await Investment.findOne({
      _id: id,
      user: req.user!._id
    }).populate('transaction');

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }

    res.json({
      success: true,
      data: { investment }
    });
  } catch (error) {
    console.error('Get investment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const cancelInvestment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const investment = await Investment.findOne({
      _id: id,
      user: req.user!._id
    });

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }

    if (investment.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active investments can be cancelled'
      });
    }

    // Check if investment has been active for at least 7 days
    const daysActive = Math.floor(
      (new Date().getTime() - investment.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysActive < 7) {
      return res.status(400).json({
        success: false,
        message: 'Investments can only be cancelled after 7 days'
      });
    }

    // Calculate cancellation fee (2%)
    const cancellationFee = investment.amount * 0.02;
    const refundAmount = investment.amount - cancellationFee;

    // Start transaction
    const session = await Investment.startSession();
    session.startTransaction();

    try {
      // Refund amount to wallet
      const wallet = await Wallet.findOne({ user: req.user!._id });
      if (wallet) {
        wallet.balance += refundAmount;
        wallet.lastTransactionDate = new Date();
        await wallet.save({ session });
      }

      // Create refund transaction
      const transaction = new Transaction({
        referenceId: `REF${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        user: req.user!._id,
        wallet: wallet!._id,
        type: 'deposit',
        amount: refundAmount,
        currency: investment.currency,
        fee: cancellationFee,
        netAmount: refundAmount,
        status: 'completed',
        description: `Investment cancellation refund - ${cancellationFee} fee applied`
      });
      await transaction.save({ session });

      // Update investment status
      investment.status = 'cancelled';
      investment.actualReturn = -cancellationFee; // Negative return due to fee
      await investment.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        message: 'Investment cancelled successfully',
        data: {
          investment,
          refundAmount,
          cancellationFee
        }
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Cancel investment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};