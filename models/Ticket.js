// models/Ticket.js - FIXED VERSION
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketNumber: {
    type: String,
    required: false, // Changed to false, will be set in pre-save
    unique: true,
    sparse: true // Allows multiple documents with null/undefined ticketNumber during creation
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
      default: false
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
  // Only generate ticket number for new documents
  if (!this.isNew) {
    return next();
  }

  try {
    const prefix = 'TKT';
    const year = new Date().getFullYear();
    
    // Find the latest ticket number for this year
    const latestTicket = await this.constructor.findOne({
      ticketNumber: new RegExp(`^${prefix}-${year}-`, 'i')
    }).sort({ createdAt: -1 }).select('ticketNumber').lean();
    
    let sequence = 1;
    
    if (latestTicket && latestTicket.ticketNumber) {
      // Extract sequence number (format: TKT-2025-0001)
      const match = latestTicket.ticketNumber.match(/-(\d+)$/);
      if (match && match[1]) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }
    
    // Generate new ticket number with leading zeros (4 digits)
    this.ticketNumber = `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
    
    console.log('✅ Generated ticket number:', this.ticketNumber);
    next();
    
  } catch (error) {
    console.error('❌ Error generating ticket number:', error);
    next(error);
  }
});

// Indexes for better performance
ticketSchema.index({ userId: 1, createdAt: -1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ ticketNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Ticket', ticketSchema);