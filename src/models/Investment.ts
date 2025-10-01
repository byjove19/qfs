// src/models/Investment.ts
import { Schema, model, Document, Types } from 'mongoose';

export type InvestmentStatus = 'active' | 'completed' | 'cancelled';
export type InvestmentPlan = 'basic' | 'premium' | 'vip';

export interface IInvestment extends Document {
  user: Types.ObjectId;
  transaction: Types.ObjectId;
  plan: InvestmentPlan;
  amount: number;
  currency: string;
  expectedReturn: number;
  actualReturn?: number;
  duration: number; // in days
  startDate: Date;
  endDate: Date;
  status: InvestmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const investmentSchema = new Schema<IInvestment>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  transaction: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true },
  plan: { 
    type: String, 
    enum: ['basic', 'premium', 'vip'],
    required: true 
  },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, uppercase: true },
  expectedReturn: { type: Number, required: true },
  actualReturn: { type: Number, default: 0 },
  duration: { type: Number, required: true, min: 1 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  }
}, {
  timestamps: true
});

investmentSchema.index({ user: 1, status: 1 });
investmentSchema.index({ endDate: 1 });

export default model<IInvestment>('Investment', investmentSchema);