import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationStatus = 'unread' | 'read' | 'dismissed';

export interface INotification extends Document {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  actionUrl?: string;
  actionText?: string;
  isImportant: boolean;
  expiresAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['unread', 'read', 'dismissed'], default: 'unread' },
  actionUrl: String,
  actionText: String,
  isImportant: { type: Boolean, default: false },
  expiresAt: Date,
  readAt: Date
}, {
  timestamps: true
});

notificationSchema.index({ user: 1, status: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model<INotification>('Notification', notificationSchema);