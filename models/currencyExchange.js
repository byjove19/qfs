const mongoose = require('mongoose');

const exchangeRateSchema = new mongoose.Schema({
  fromCurrency: {
    type: String,
    required: true,
    uppercase: true,
    enum: ['USD', 'BTC', 'ETH', 'LTC', 'XRP', 'STRAWMAN', 'XDC', 'XLM', 'MATIC', 'ALGO']
  },
  toCurrency: {
    type: String,
    required: true,
    uppercase: true,
    enum: ['USD', 'BTC', 'ETH', 'LTC', 'XRP', 'STRAWMAN', 'XDC', 'XLM', 'MATIC', 'ALGO']
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  feePercentage: {
    type: Number,
    default: 0.5,
    min: 0,
    max: 100
  },
  fixedFee: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    lastUpdateSource: {
      type: String,
      enum: ['manual', 'api', 'system'],
      default: 'manual'
    },
    updateNotes: String,
    autoUpdateEnabled: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Compound index to ensure unique currency pairs
exchangeRateSchema.index({ fromCurrency: 1, toCurrency: 1 }, { unique: true });

// Virtual for inverse rate
exchangeRateSchema.virtual('inverseRate').get(function() {
  return this.rate !== 0 ? 1 / this.rate : 0;
});

// Method to check if rate is valid
exchangeRateSchema.methods.isValidRate = function() {
  return this.rate > 0 && this.isActive;
};

// Static method to get rate between two currencies
exchangeRateSchema.statics.getRate = async function(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1;
  
  const rate = await this.findOne({
    fromCurrency: fromCurrency.toUpperCase(),
    toCurrency: toCurrency.toUpperCase(),
    isActive: true
  });
  
  return rate ? rate.rate : null;
};

// Static method to get all active rates
exchangeRateSchema.statics.getAllRates = async function() {
  const rates = await this.find({ isActive: true });
  const rateMap = {};
  
  rates.forEach(rate => {
    if (!rateMap[rate.fromCurrency]) {
      rateMap[rate.fromCurrency] = {};
    }
    rateMap[rate.fromCurrency][rate.toCurrency] = {
      rate: rate.rate,
      feePercentage: rate.feePercentage,
      fixedFee: rate.fixedFee
    };
  });
  
  return rateMap;
};

module.exports = mongoose.model('ExchangeRate', exchangeRateSchema);