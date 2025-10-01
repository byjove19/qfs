// src/models/Dispute.ts
import { Schema, model, Document, Types } from 'mongoose';

export type DisputeStatus = 'open' | 'under-review' | 'resolved' | 'closed';
export type DisputeReason = 'unauthorized' | 'not-received' | 'wrong-amount' | 'other';

export interface IDispute extends Document {
  disputeId: string;
  user: Types.ObjectId;
  transaction: Types.ObjectId;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  evidence: string[];
  resolution?: string;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const disputeSchema = new Schema<IDispute>({
  disputeId: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  transaction: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true },
  reason: {
    type: String,
    enum: ['unauthorized', 'not-received', 'wrong-amount', 'other'],
    required: true
  },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ['open', 'under-review', 'resolved', 'closed'],
    default: 'open'
  },
  evidence: [String],
  resolution: String,
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date
}, {
  timestamps: true
});

disputeSchema.index({ user: 1 });
disputeSchema.index({ transaction: 1 });
disputeSchema.index({ status: 1 });

export default model<IDispute>('Dispute', disputeSchema);