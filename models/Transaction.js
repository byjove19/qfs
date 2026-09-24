const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'send', 'request', 'exchange'],
    required: true
  },
  method: {
    type: String,
    enum: ['bank', 'crypto', 'manual', 'card'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },

currency: {
  type: String,
  enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'BTC', 'ETH', 'XRP', 'STRAWMAN', 'LTC', 'ALGO', 'XDC', 'XLM', 'MATIC'],
  default: 'USD'
},

  type: {
  type: String,
  enum: ['deposit', 'withdrawal', 'send', 'request', 'exchange', 'admin_credit', 'admin_debit', 'system'],
  required: true
},
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  referenceId: {
    type: String,
    unique: true
  },
  description: String,
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fromCurrency: String,
  toCurrency: String,
  exchangeRate: Number,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

transactionSchema.pre('save', function(next) {
  if (!this.referenceId) {
    this.referenceId = 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9);
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);