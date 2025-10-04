const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currency: {
    type: String,
    enum: ['USD', 'BTC', 'ETH', 'XRP', 'DOGE'],
    default: 'USD'
  },
  balance: {
    type: Number,
    default: 0
  },
  lastAction: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

walletSchema.index({ userId: 1, currency: 1 }, { unique: true });

module.exports = mongoose.model('Wallet', walletSchema);