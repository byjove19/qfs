// src/controllers/disputeController.ts
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middlewares/authMiddleware';
import Dispute, { IDispute } from '../models/Dispute';
import Transaction from '../models/Transaction';
import Wallet from '../models/Wallet';
import logger from '../utils/logger';

export const createDispute = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { transactionId, reason, description } = req.body;

    // Verify transaction exists and belongs to user
    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: req.user!._id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if dispute already exists for this transaction
    const existingDispute = await Dispute.findOne({ transaction: transactionId });
    if (existingDispute) {
      return res.status(400).json({
        success: false,
        message: 'Dispute already exists for this transaction'
      });
    }

    // Check if transaction is eligible for dispute (within 30 days)
    const disputePeriod = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    const transactionAge = Date.now() - transaction.createdAt.getTime();
    
    if (transactionAge > disputePeriod) {
      return res.status(400).json({
        success: false,
        message: 'Transaction is too old to dispute (must be within 30 days)'
      });
    }

    const dispute = new Dispute({
      disputeId: `DSP${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      user: req.user!._id,
      transaction: transactionId,
      reason,
      description,
      status: 'open',
      evidence: req.files ? (req.files as Express.Multer.File[]).map(f => f.filename) : []
    });

    await dispute.save();

    // Update transaction status to disputed
    transaction.status = 'disputed';
    await transaction.save();

    res.status(201).json({
      success: true,
      message: 'Dispute created successfully',
      data: { dispute }
    });
  } catch (error) {
    console.error('Create dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getDisputes = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    const filter: any = { user: req.user!._id };
    if (status) filter.status = status;

    const disputes = await Dispute.find(filter)
      .populate('transaction')
      .populate('resolvedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Dispute.countDocuments(filter);

    res.json({
      success: true,
      data: {
        disputes,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get disputes error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getDispute = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const dispute = await Dispute.findOne({
      _id: id,
      user: req.user!._id
    })
    .populate('transaction')
    .populate('resolvedBy', 'firstName lastName email');

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    res.json({
      success: true,
      data: { dispute }
    });
  } catch (error) {
    console.error('Get dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const addDisputeEvidence = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const dispute = await Dispute.findOne({
      _id: id,
      user: req.user!._id
    });

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    if (dispute.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add evidence to a resolved dispute'
      });
    }

    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided'
      });
    }

    const newEvidence = (req.files as Express.Multer.File[]).map(f => f.filename);
    dispute.evidence.push(...newEvidence);
    await dispute.save();

    res.json({
      success: true,
      message: 'Evidence added successfully',
      data: { dispute }
    });
  } catch (error) {
    console.error('Add dispute evidence error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Admin functions
export const getAdminDisputes = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    const filter: any = {};
    if (status) filter.status = status;

    const disputes = await Dispute.find(filter)
      .populate('user', 'firstName lastName email')
      .populate('transaction')
      .populate('resolvedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Dispute.countDocuments(filter);

    res.json({
      success: true,
      data: {
        disputes,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get admin disputes error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const resolveDispute = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { resolution, refundAmount = 0 } = req.body;

    const dispute = await Dispute.findById(id)
      .populate('user')
      .populate('transaction');

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    if (dispute.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Dispute is already resolved'
      });
    }

    // Start transaction for dispute resolution
    const session = await Dispute.startSession();
    session.startTransaction();

    try {
      // Update dispute status
      dispute.status = 'resolved';
      dispute.resolution = resolution;
      dispute.resolvedBy = req.user!._id;
      dispute.resolvedAt = new Date();
      await dispute.save({ session });

      // Update transaction status
      const transaction = await Transaction.findById(dispute.transaction._id);
      if (transaction) {
        transaction.status = 'completed'; // Reset from disputed status
        await transaction.save({ session });
      }

      // Process refund if applicable
      if (refundAmount > 0) {
        const wallet = await Wallet.findOne({ user: dispute.user._id });
        if (wallet) {
          wallet.balance += refundAmount;
          wallet.lastTransactionDate = new Date();
          await wallet.save({ session });

          // Create refund transaction
          const refundTransaction = new Transaction({
            referenceId: `REF${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
            user: dispute.user._id,
            wallet: wallet._id,
            type: 'deposit',
            amount: refundAmount,
            currency: wallet.currency,
            fee: 0,
            netAmount: refundAmount,
            status: 'completed',
            description: `Dispute resolution refund: ${resolution}`
          });
          await refundTransaction.save({ session });
        }
      }

      await session.commitTransaction();
      session.endSession();

      // Log admin action
      await logger.logAdminAction(
        req.user!._id.toString(),
        'resolve-dispute',
        'Dispute',
        id,
        { status: 'open' },
        { status: 'resolved', resolution, refundAmount },
        `Resolved dispute ${dispute.disputeId} for user ${typeof dispute.user === 'object' && 'email' in dispute.user ? (dispute.user as any).email : dispute.user}`,
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown'
      );

      const updatedDispute = await Dispute.findById(id)
        .populate('user', 'firstName lastName email')
        .populate('transaction')
        .populate('resolvedBy', 'firstName lastName email');

      res.json({
        success: true,
        message: 'Dispute resolved successfully',
        data: { dispute: updatedDispute }
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};