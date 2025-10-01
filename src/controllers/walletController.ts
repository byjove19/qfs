// src/controllers/walletController.ts
import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';

export const getWallet = async (req: AuthRequest, res: Response) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user!._id });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    // Get recent transactions
    const recentTransactions = await Transaction.find({ 
      user: req.user!._id 
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('metadata.recipient', 'firstName lastName email')
    .populate('metadata.sender', 'firstName lastName email');

    res.json({
      success: true,
      data: {
        wallet,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateWalletCurrency = async (req: AuthRequest, res: Response) => {
  try {
    const { currency } = req.body;

    const wallet = await Wallet.findOne({ user: req.user!._id });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    // Check if currency is valid (you might want to add currency validation)
    wallet.currency = currency;
    await wallet.save();

    res.json({
      success: true,
      message: 'Wallet currency updated successfully',
      data: { wallet }
    });
  } catch (error) {
    console.error('Update wallet currency error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};