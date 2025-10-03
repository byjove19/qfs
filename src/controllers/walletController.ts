// src/controllers/walletController.ts
import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';

// Helper function for currency icons
function getCurrencyIcon(currency: string): string {
    const iconMap: { [key: string]: string } = {
        'USD': 'icons8-us-dollar-64.png',
        'BTC': '1698103759.png',
        'ETH': '1698011100.png',
        'LTC': '1698103966.png',
        'DOGE': '1698104977.png',
        'XDC': '1698104836.png',
        'XLM': '1698104729.png',
        'MATIC': '1698104560.png',
        'XRP': '1698104378.png',
        'ALGO': '1698105102.png'
    };
    return iconMap[currency] || 'default.png';
}

// Controller for rendering the wallet list page
export const getWalletPage = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Fetching wallets for user:', req.user!._id);
    
    // Get all wallets for the user
    const wallets = await Wallet.find({ user: req.user!._id }).sort({ isDefault: -1, createdAt: 1 });
    
    console.log('Found wallets:', wallets.length);
    
    // If no wallets exist, create default ones
    if (!wallets || wallets.length === 0) {
      console.log('No wallets found, creating default wallets...');
      const { createDefaultWallets } = await import('../utils/wallet');
      await createDefaultWallets(req.user!._id);
      
      // Fetch wallets again after creation
      const newWallets = await Wallet.find({ user: req.user!._id }).sort({ isDefault: -1, createdAt: 1 });
      console.log('New wallets created:', newWallets.length);
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
  try {
    console.log('Rendering wallet page with', wallets.length, 'wallets');
    
    // Get last transactions for each wallet
    const walletData = await Promise.all(
      wallets.map(async (wallet) => {
        // Get the last transaction for this specific wallet/currency
        const lastTransaction = await Transaction.findOne({
          user: user._id,
          $or: [
            { 'metadata.currency': wallet.currency },
            { 'metadata.fromCurrency': wallet.currency },
            { 'metadata.toCurrency': wallet.currency }
          ]
        }).sort({ createdAt: -1 });

        return {
          _id: wallet._id,
          currency: wallet.currency,
          type: wallet.type,
          balance: wallet.balance || 0,
          isDefault: wallet.isDefault || false,
          isActive: wallet.isActive !== false,
          icon: getCurrencyIcon(wallet.currency),
          lastTransaction: lastTransaction ? {
            amount: lastTransaction.amount,
            type: lastTransaction.type
          } : null
        };
      })
    );

    console.log('Processed wallet data:', walletData);

    // Render the wallet list page with the data
    res.render('wallet', {
      user: user,
      wallets: walletData, // This is the key - make sure it's passed as 'wallets'
      title: 'Wallet List'
    });
  } catch (error) {
    console.error('Render wallet page error:', error);
    res.status(500).render('error', {
      message: 'Internal server error',
      user: user
    });
  }
}