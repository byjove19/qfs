// src/models/DashboardStats.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IDashboardStats extends Document {
  user: Types.ObjectId;
  period: string; // 'daily', 'weekly', 'monthly'
  date: Date;
  
  // Financial stats
  totalBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalSent: number;
  totalReceived: number;
  netFlow: number;
  
  // Transaction counts
  transactionCount: number;
  depositCount: number;
  withdrawalCount: number;
  sendCount: number;
  receiveCount: number;
  
  // Investment stats
  totalInvested: number;
  activeInvestments: number;
  investmentReturns: number;
  
  // Performance metrics
  growthRate: number;
  activityScore: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const dashboardStatsSchema = new Schema<IDashboardStats>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  period: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly'],
    required: true 
  },
  date: { type: Date, required: true },
  
  // Financial stats
  totalBalance: { type: Number, default: 0 },
  totalDeposits: { type: Number, default: 0 },
  totalWithdrawals: { type: Number, default: 0 },
  totalSent: { type: Number, default: 0 },
  totalReceived: { type: Number, default: 0 },
  netFlow: { type: Number, default: 0 },
  
  // Transaction counts
  transactionCount: { type: Number, default: 0 },
  depositCount: { type: Number, default: 0 },
  withdrawalCount: { type: Number, default: 0 },
  sendCount: { type: Number, default: 0 },
  receiveCount: { type: Number, default: 0 },
  
  // Investment stats
  totalInvested: { type: Number, default: 0 },
  activeInvestments: { type: Number, default: 0 },
  investmentReturns: { type: Number, default: 0 },
  
  // Performance metrics
  growthRate: { type: Number, default: 0 },
  activityScore: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Compound index for efficient queries
dashboardStatsSchema.index({ user: 1, period: 1, date: -1 });
dashboardStatsSchema.index({ user: 1, createdAt: -1 });

export default model<IDashboardStats>('DashboardStats', dashboardStatsSchema);