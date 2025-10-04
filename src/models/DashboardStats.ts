import { Schema, model, Document, Types } from 'mongoose';

export interface IDashboardStats extends Document {
  user: Types.ObjectId;
  period: string;
  date: Date;
  totalBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalSent: number;
  totalReceived: number;
  netFlow: number;
  transactionCount: number;
  depositCount: number;
  withdrawalCount: number;
  sendCount: number;
  receiveCount: number;
  totalInvested: number;
  activeInvestments: number;
  investmentReturns: number;
  growthRate: number;
  activityScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const dashboardStatsSchema = new Schema<IDashboardStats>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  period: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  date: { type: Date, required: true },
  totalBalance: { type: Number, default: 0 },
  totalDeposits: { type: Number, default: 0 },
  totalWithdrawals: { type: Number, default: 0 },
  totalSent: { type: Number, default: 0 },
  totalReceived: { type: Number, default: 0 },
  netFlow: { type: Number, default: 0 },
  transactionCount: { type: Number, default: 0 },
  depositCount: { type: Number, default: 0 },
  withdrawalCount: { type: Number, default: 0 },
  sendCount: { type: Number, default: 0 },
  receiveCount: { type: Number, default: 0 },
  totalInvested: { type: Number, default: 0 },
  activeInvestments: { type: Number, default: 0 },
  investmentReturns: { type: Number, default: 0 },
  growthRate: { type: Number, default: 0 },
  activityScore: { type: Number, default: 0 }
}, {
  timestamps: true
});

dashboardStatsSchema.index({ user: 1, period: 1, date: -1 });

export default model<IDashboardStats>('DashboardStats', dashboardStatsSchema);