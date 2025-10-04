// src/types/transaction.ts
import { TransactionType, TransactionStatus } from '../models/Transaction';

export interface TransactionFilters {
  type?: TransactionType | 'all';
  status?: TransactionStatus | 'all';
  wallet?: string | 'all';
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export interface TransactionResponse {
  success: boolean;
  message?: string;
  data?: {
    transactions: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  error?: string;
}

export interface CreateTransactionData {
  userId: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  fee?: number;
  metadata?: any;
}