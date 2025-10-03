// src/utils/walletUtils.ts
import Wallet from '../models/Wallet';
import { Types } from 'mongoose';

export const createDefaultWallets = async (userId: Types.ObjectId) => {
  const defaultWallets = [
    { 
      user: userId, 
      currency: 'USD', 
      type: 'fiat' as const, 
      isDefault: true,
      balance: 0 
    },
    { 
      user: userId, 
      currency: 'BTC', 
      type: 'crypto' as const, 
      balance: 0 
    },
    { 
      user: userId, 
      currency: 'ETH', 
      type: 'crypto' as const, 
      balance: 0 
    },
    // Add more currencies as needed
  ];

  try {
    await Wallet.insertMany(defaultWallets);
    console.log(`Default wallets created for user ${userId}`);
  } catch (error) {
    console.error('Error creating default wallets:', error);
    throw error;
  }
};