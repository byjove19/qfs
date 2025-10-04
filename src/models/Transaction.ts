// src/models/Transaction.ts
import { Schema, model, Document, Types } from 'mongoose';

export type TransactionType = 
  | 'deposit' 
  | 'withdrawal' 
  | 'send' 
  | 'received' 
  | 'exchange_from' 
  | 'exchange_to' 
  | 'request_sent' 
  | 'request_received' 
  | 'payment_sent' 
  | 'payment_received' 
  | 'crypto_sent' 
  | 'crypto_received';

export type TransactionStatus = 
  | 'pending' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'disputed';

export interface ITransaction extends Document {
  referenceId: string;
  user: Types.ObjectId;
  wallet: Types.ObjectId;
  type: TransactionType;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  status: TransactionStatus;
  description: string;
  metadata: {
    recipient?: Types.ObjectId;
    sender?: Types.ObjectId;
    exchangeFrom?: string;
    exchangeTo?: string;
    exchangeRate?: number;
    bankAccount?: string;
    cryptoAddress?: string;
    paymentMethod?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  referenceId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  wallet: { 
    type: Schema.Types.ObjectId, 
    ref: 'Wallet', 
    required: true 
  },
  type: { 
    type: String, 
    enum: [
      'deposit', 'withdrawal', 'send', 'received', 
      'exchange_from', 'exchange_to', 'request_sent', 
      'request_received', 'payment_sent', 'payment_received',
      'crypto_sent', 'crypto_received'
    ],
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    required: true, 
    uppercase: true 
  },
  fee: { 
    type: Number, 
    default: 0 
  },
  netAmount: { 
    type: Number, 
    required: true 
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'disputed'],
    default: 'pending'
  },
  description: { 
    type: String, 
    required: true 
  },
  metadata: {
    recipient: { type: Schema.Types.ObjectId, ref: 'User' },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    exchangeFrom: String,
    exchangeTo: String,
    exchangeRate: Number,
    bankAccount: String,
    cryptoAddress: String,
    paymentMethod: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ referenceId: 1 });

export default model<ITransaction>('Transaction', transactionSchema);