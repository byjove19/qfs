// src/models/Wallet.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IWallet extends Document {
  user: Types.ObjectId;
  currency: string;
  balance: number;
  type: 'fiat' | 'crypto';
  isDefault: boolean;
  isActive: boolean;
  lastTransactionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  currency: { 
    type: String, 
    required: true, 
    uppercase: true 
  },
  balance: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  type: { 
    type: String, 
    enum: ['fiat', 'crypto'], 
    required: true 
  },
  isDefault: { 
    type: Boolean, 
    default: false 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  lastTransactionDate: Date
}, {
  timestamps: true
});


walletSchema.index({ user: 1, currency: 1 }, { unique: true });

export default model<IWallet>('Wallet', walletSchema);