const mongoose = require('mongoose');

const withdrawalSettingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  method: {
    type: String,
    enum: ['bank', 'crypto'],
    required: true
  },
  bankName: String,
  accountNumber: String,
  routingNumber: String,
  accountHolder: String,
  cryptoWallet: String,
  cryptoCurrency: {
    type: String,
    enum: ['BTC', 'ETH', 'XRP', 'STRAWMAN']
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WithdrawalSetting', withdrawalSettingSchema);