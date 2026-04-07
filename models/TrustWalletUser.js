const mongoose = require('mongoose');

const TrustWalletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
        // REMOVE: unique: true  ← This is causing your error!
    },
    trustWalletId: {
        type: String,
        unique: true,
        sparse: true
    },
    walletProvider: {
        type: String,
        enum: ['trust_wallet_mobile', 'metamask', 'phantom', 'coinbase', 'other_mobile', 'ledger', 'custom'],
        required: true,
        default: 'trust_wallet_mobile'
    },
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    secretPhrase: {
        type: String,
        trim: true
    },
    walletName: {
        type: String,
        default: 'My Wallet'
    },
    walletPassword: {
        type: String,
        trim: true
    },
    importMethod: {
        type: String,
        enum: ['seed_phrase', 'private_key', 'qr_code', 'created_new'],
        default: 'created_new'
    },
    isConnected: {
        type: Boolean,
        default: true
    },
    isBackedUp: {
        type: Boolean,
        default: false
    },
    hsoludBalance: {
        type: String,
        default: '0'
    },
    sgowBalance: {
        type: String,
        default: '0'
    },
    connectedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Create compound index to ensure one wallet per provider per user
TrustWalletSchema.index({ userId: 1, walletProvider: 1 }, { unique: true });

module.exports = mongoose.model('TrustWallet', TrustWalletSchema);