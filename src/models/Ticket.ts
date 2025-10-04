// src/models/Ticket.ts
import { Schema, model, Document, Types } from 'mongoose';

export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ITicket extends Document {
  ticketId: string;
  user: Types.ObjectId;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: Types.ObjectId;
  messages: Array<{
    user: Types.ObjectId;
    message: string;
    attachments: string[];
    isInternal: boolean;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>({
  ticketId: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  messages: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    attachments: [String],
    isInternal: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

ticketSchema.index({ user: 1, status: 1 });
ticketSchema.index({ assignedTo: 1 });

export default model<ITicket>('Ticket', ticketSchema);