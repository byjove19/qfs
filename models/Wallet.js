const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    currency: {
        type: String,
        required: true,
        enum: ['USD', 'BTC', 'ETH', 'LTC', 'XRP', 'DOGE', 'XDC', 'XLM', 'MATIC', 'ALGO'], // Changed 'Doge' to 'DOGE', 'Matic' to 'MATIC'
        uppercase: true
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    lastAction: {
        amount: { 
            type: Number, 
            default: 0 
        },
        type: { 
            type: String, 
            default: 'No transaction available.' 
        },
        date: { 
            type: Date, 
            default: Date.now 
        }
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Compound index to ensure one wallet per currency per user
walletSchema.index({ userId: 1, currency: 1 }, { unique: true });

// Virtual for formatted balance display
walletSchema.virtual('formattedBalance').get(function() {
    if (this.currency === 'USD') {
        return `$${this.balance.toFixed(2)}`;
    } else {
        return this.balance.toFixed(8);
    }
});

// Method to check if balance is sufficient
walletSchema.methods.hasSufficientBalance = function(amount) {
    return this.balance >= amount;
};

// Static method to get user's total portfolio value
walletSchema.statics.getPortfolioValue = async function(userId) {
    const wallets = await this.find({ userId });
    // This would need exchange rate integration for real implementation
    return wallets.reduce((total, wallet) => total + wallet.balance, 0);
};

module.exports = mongoose.model('Wallet', walletSchema);