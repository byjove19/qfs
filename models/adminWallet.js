const mongoose = require('mongoose');

const adminWalletSchema = new mongoose.Schema({
  currency: {
    type: String,
    required: true,
    unique: true,
    enum: ['BTC', 'ETH', 'LTC', 'XRP', 'XLM', 'DOGE', 'USDT-ERC20', 'USDT-TRC20', 'ALGO', 'MATIC', 'SOL', 'USDC']
  },
  address: {
    type: String,
    required: true
  },
  network: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  qrCode: {
    type: String,
    default: ''
  },
  minDeposit: {
    type: Number,
    default: 100
  },
  maxDeposit: {
    type: Number,
    default: 100000
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdminWallet', adminWalletSchema);