import { Schema, model, Document, Types } from 'mongoose';

// Add 'page_view' to the ActivityType enum
export type ActivityType = 'login' | 'transaction' | 'investment' | 'withdrawal' | 'deposit' | 'profile_update' | 'page_view';

export interface IUserActivity extends Document {
  user: Types.ObjectId;
  type: ActivityType;
  description: string;
  ipAddress: string;
  userAgent: string;
  metadata: {
    transactionId?: Types.ObjectId;
    investmentId?: Types.ObjectId;
    amount?: number;
    currency?: string;
    recipient?: Types.ObjectId;
    oldValue?: any;
    newValue?: any;
  };
  createdAt: Date;
}

const userActivitySchema = new Schema<IUserActivity>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    // Add 'page_view' to the enum array
    enum: ['login', 'transaction', 'investment', 'withdrawal', 'deposit', 'profile_update', 'page_view'],
    required: true
  },
  description: { type: String, required: true },
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true },
  metadata: {
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
    investmentId: { type: Schema.Types.ObjectId, ref: 'Investment' },
    amount: Number,
    currency: String,
    recipient: { type: Schema.Types.ObjectId, ref: 'User' },
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

userActivitySchema.index({ user: 1, createdAt: -1 });
userActivitySchema.index({ type: 1, createdAt: -1 });

export default model<IUserActivity>('UserActivity', userActivitySchema);