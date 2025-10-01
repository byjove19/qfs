// src/models/Wallet.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IWallet extends Document {
  user: Types.ObjectId;
  balance: number;
  currency: string;
  isActive: boolean;
  lastTransactionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'USD', uppercase: true },
  isActive: { type: Boolean, default: true },
  lastTransactionDate: Date
}, {
  timestamps: true
});


walletSchema.index({ currency: 1 });

export default model<IWallet>('Wallet', walletSchema);