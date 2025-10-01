// src/models/AdminLog.ts
import { Schema, model, Document, Types } from 'mongoose';

export type AdminAction = 'create' | 'update' | 'delete' | 'adjust-balance' | 'resolve-dispute';

export interface IAdminLog extends Document {
  admin: Types.ObjectId;
  action: AdminAction;
  targetModel: string;
  targetId: Types.ObjectId;
  previousData?: any;
  newData?: any;
  description: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

const adminLogSchema = new Schema<IAdminLog>({
  admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'adjust-balance', 'resolve-dispute'],
    required: true
  },
  targetModel: { type: String, required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  previousData: Schema.Types.Mixed,
  newData: Schema.Types.Mixed,
  description: { type: String, required: true },
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true }
}, {
  timestamps: true
});

adminLogSchema.index({ admin: 1, createdAt: -1 });
adminLogSchema.index({ targetModel: 1, targetId: 1 });

export default model<IAdminLog>('AdminLog', adminLogSchema);