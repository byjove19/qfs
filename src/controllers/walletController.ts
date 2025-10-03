// src/controllers/walletController.ts
import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';

// Controller for rendering the wallet list page
export const getWalletPage = async (req: AuthRequest, res: Response) => {
  try {
    // Get all wallets for the user
    const wallets = await Wallet.find({ user: req.user!._id }).sort({ isDefault: -1, createdAt: 1 });
    
    // If no wallets exist, create default ones
    if (!wallets || wallets.length === 0) {
      const { createDefaultWallets } = await import('../utils/wallet');
      await createDefaultWallets(req.user!._id);
      
      // Fetch wallets again after creation
      const newWallets = await Wallet.find({ user: req.user!._id }).sort({ isDefault: -1, createdAt: 1 });
      return renderWalletPage(res, req.user!, newWallets);
    }
    
    await renderWalletPage(res, req.user!, wallets);
  } catch (error) {
    console.error('Get wallet page error:', error);
    res.status(500).render('error', {
      message: 'Internal server error',
      user: req.user
    });
  }
};

// Helper function to render the wallet page
async function renderWalletPage(res: Response, user: any, wallets: any[]) {
  // Calculate totals
  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  const totalFiatBalance = wallets
    .filter(wallet => wallet.type === 'fiat')
    .reduce((sum, wallet) => sum + wallet.balance, 0);
  const totalCryptoBalance = wallets
    .filter(wallet => wallet.type === 'crypto')
    .reduce((sum, wallet) => sum + wallet.balance, 0);

  // Get recent transactions for display
  const recentTransactions = await Transaction.find({ 
    user: user._id 
  })
  .sort({ createdAt: -1 })
  .limit(5)
  .populate('metadata.recipient', 'firstName lastName email')
  .populate('metadata.sender', 'firstName lastName email');

  // Format wallet data for the template
  const formattedWallets = wallets.map(wallet => {
    // Find the last transaction for this wallet
    const lastTransaction = recentTransactions.find(t => 
      t.metadata && 'currency' in t.metadata && (t.metadata as any).currency === wallet.currency
    );

    return {
      id: wallet._id,
      currency: wallet.currency,
      type: wallet.type,
      balance: wallet.balance,
      isDefault: wallet.isDefault,
      isActive: wallet.isActive,
      lastAction: lastTransaction ? {
        amount: lastTransaction.amount,
        type: lastTransaction.type
      } : null
    };
  });

  // Render the wallet list page
  res.render('wallet', {
    user: user,
    wallets: formattedWallets,
    totalBalance,
    totalFiatBalance,
    totalCryptoBalance,
    recentTransactions
  });
}

// Your existing API controllers remain the same...
export const getWallet = async (req: AuthRequest, res: Response) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user!._id });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

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