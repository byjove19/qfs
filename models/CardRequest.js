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
    min: 10
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'issued', 'active'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'refunded', 'failed'],
    default: 'pending'
  },
  userEmail: String,
  userName: String,
  
  // Card details
  cardNumber: String,
  expiryDate: String,
  cvv: String,
  cardHolderName: String,
  
  // Admin processing
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  adminNote: String,
  rejectionReason: String,
  
  // Fees
  issuanceFee: {
    type: Number,
    default: 10.00
  },
  totalAmount: Number,
  
  // Timestamps
  approvedAt: Date,
  rejectedAt: Date,
  issuedAt: Date,
  activatedAt: Date,
  
}, {
  timestamps: true
});

// Indexes
cardRequestSchema.index({ userId: 1, status: 1 });
cardRequestSchema.index({ status: 1 });
cardRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CardRequest', cardRequestSchema);