// models/Ticket.js
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketNumber: {
    type: String,
    required: true,
    unique: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['technical', 'billing', 'account', 'general', 'feature', 'other'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'on-hold', 'resolved', 'closed'],
    default: 'open'
  },
  messages: [{
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    attachments: [String],
    isInternal: {
      type: Boolean,
      default: false // If true, only admins can see this message
    }
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closedAt: Date,
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    attachment: {
      filename: String,
      originalName: String,
      size: Number,
      mimetype: String
    }
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate ticket number
ticketSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketNumber) {
    try {
      const Ticket = this.constructor;
      const prefix = 'TKT';
      const year = new Date().getFullYear();
      
      // Find the latest ticket for this year
      const latestTicket = await Ticket.findOne({
        ticketNumber: new RegExp(`^${prefix}-${year}-`)
      }).sort({ createdAt: -1 });
      
      let sequence = 1;
      if (latestTicket && latestTicket.ticketNumber) {
        // Extract sequence number from existing ticket (format: TKT-2024-0001)
        const match = latestTicket.ticketNumber.match(/-(\d+)$/);
        if (match) {
          sequence = parseInt(match[1]) + 1;
        }
      }
      
      // Generate new ticket number with leading zeros
      this.ticketNumber = `${prefix}-${year}-${sequence.toString().padStart(4, '0')}`;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Index for better performance
ticketSchema.index({ userId: 1, createdAt: -1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ ticketNumber: 1 }, { unique: true });

module.exports = mongoose.model('Ticket', ticketSchema);