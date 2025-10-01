// src/models/WithdrawalSetting.ts
import { Schema, model, Document, Types } from 'mongoose';

export type WithdrawalMethod = 'bank' | 'crypto' | 'paypal';

export interface IWithdrawalSetting extends Document {
  user: Types.ObjectId;
  method: WithdrawalMethod;
  isDefault: boolean;
  
  // Bank details
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
  accountHolderName?: string;
  
  // Crypto details
  cryptoCurrency?: string;
  walletAddress?: string;
  
  // PayPal details
  paypalEmail?: string;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalSettingSchema = new Schema<IWithdrawalSetting>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  method: { 
    type: String, 
    enum: ['bank', 'crypto', 'paypal'],
    required: true 
  },
  isDefault: { type: Boolean, default: false },
  
  // Bank details
  bankName: String,
  accountNumber: String,
  routingNumber: String,
  accountHolderName: String,
  
  // Crypto details
  cryptoCurrency: String,
  walletAddress: String,
  
  // PayPal details
  paypalEmail: String,
  
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

withdrawalSettingSchema.index({ user: 1, isDefault: 1 });
withdrawalSettingSchema.index({ user: 1, method: 1 });

export default model<IWithdrawalSetting>('WithdrawalSetting', withdrawalSettingSchema);