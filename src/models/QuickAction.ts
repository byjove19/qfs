import { Schema, model, Document, Types } from 'mongoose';

export interface IQuickAction extends Document {
  user: Types.ObjectId;
  actionType: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  color: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const quickActionSchema = new Schema<IQuickAction>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actionType: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  url: { type: String, required: true },
  color: { type: String, default: '#635BFE' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, {
  timestamps: true
});

quickActionSchema.index({ user: 1, isActive: 1, order: 1 });

export default model<IQuickAction>('QuickAction', quickActionSchema);