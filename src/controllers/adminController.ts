// src/controllers/adminController.ts
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middlewares/authMiddleware';
import User from '../models/User';
import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';
import AdminLog from '../models/AdminLog';
import logger from '../utils/logger';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // Total users count
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
    
    // Total transactions stats
    const totalTransactions = await Transaction.countDocuments();
    const totalVolume = await Transaction.aggregate([
      { $match: { status: 'completed', amount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Recent transactions
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'firstName lastName email');

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeUsers,
          totalTransactions,
          totalVolume: totalVolume[0]?.total || 0
        },
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    
    const filter: any = {};
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getUserDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const wallet = await Wallet.findOne({ user: id });
    const transactions = await Transaction.find({ user: id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      data: {
        user,
        wallet,
        transactions
      }
    });
  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
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
    const { role, isVerified } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const previousData = {
      role: user.role,
      isVerified: user.isVerified
    };

    if (role) user.role = role;
    if (typeof isVerified === 'boolean') user.isVerified = isVerified;

    await user.save();

    // Log admin action
    await logger.logAdminAction(
      (req.user as { _id: any })._id.toString(),
      'update',
      'User',
      id,
      previousData,
      { role: user.role, isVerified: user.isVerified },
      `Updated user ${user.email}`,
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const adjustBalance = async (req: AuthRequest, res: Response) => {
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
    const { amount, type, description } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const wallet = await Wallet.findOne({ user: id });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    const previousBalance = wallet.balance;
    let newBalance = previousBalance;

    if (type === 'add') {
      newBalance += amount;
    } else if (type === 'subtract') {
      if (wallet.balance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance to subtract'
        });
      }
      newBalance -= amount;
    }

    wallet.balance = newBalance;
    wallet.lastTransactionDate = new Date();
    await wallet.save();

    // Create adjustment transaction
    const transaction = new Transaction({
      referenceId: `ADJ${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
      user: id,
      wallet: wallet._id,
      type: type === 'add' ? 'deposit' : 'withdrawal',
      amount: type === 'add' ? amount : -amount,
      currency: wallet.currency,
      fee: 0,
      netAmount: type === 'add' ? amount : -amount,
      status: 'completed',
      description: `Admin adjustment: ${description}`,
      metadata: {
        admin: req.user!._id,
        adjustmentType: type
      }
    });
    await transaction.save();

    // Log admin action
    await logger.logAdminAction(
      (req.user as { _id: any })._id.toString(),
      'adjust-balance',
      'Wallet',
      (wallet._id as any).toString(),
      { balance: previousBalance },
      { balance: newBalance },
      `Adjusted balance for user ${user.email}: ${type} ${amount} ${wallet.currency}`,
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    );

    res.json({
      success: true,
      message: 'Balance adjusted successfully',
      data: {
        previousBalance,
        newBalance,
        adjustment: amount,
        type,
        transaction
      }
    });
  } catch (error) {
    console.error('Adjust balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getAdminLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, adminId, action, targetModel, startDate, endDate } = req.query;

    const logs = await logger.getAdminLogs(
      adminId as string,
      action as any,
      targetModel as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      Number(page),
      Number(limit)
    );

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Get admin logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};