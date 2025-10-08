// models/CardRequest.js
const mongoose = require('mongoose');

const cardRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cardType: {
    type: String,
    required: true,
    enum: ['amex', 'mastercard', 'verve', 'visa']
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'refunded', 'failed'],
    default: 'pending'
  },
  userEmail: String,
  userName: String,
  
  // Admin processing fields
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  adminNote: String,
  rejectionReason: String,
  
  // Card details (filled by admin when card is issued)
  cardDetails: {
    cardNumber: String, // Masked for display
    encryptedCardNumber: String, // Encrypted actual card number
    expiryDate: String,
    cvv: String,
    cardHolderName: String,
    issuedAt: Date,
    activatedAt: Date,
    status: {
      type: String,
      enum: ['active', 'inactive', 'blocked'],
      default: 'active'
    }
  },
  
  // Timestamps
  approvedAt: Date,
  rejectedAt: Date,
  completedAt: Date,
  paidAt: Date,
  
  // Additional data
  requestData: mongoose.Schema.Types.Mixed // Store original request data
  
}, {
  timestamps: true
});

// Index for better query performance
cardRequestSchema.index({ userId: 1, status: 1 });
cardRequestSchema.index({ status: 1 });
cardRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CardRequest', cardRequestSchema);