// initWallets.js
const mongoose = require('mongoose');
const WalletAddress = require('./models/adminWallet'); // Adjust path as needed

// Default wallet addresses
const defaultWallets = [
    { currency: 'BTC', address: 'bc1qnvk84egsa6ztp7talek9ut2qafw8pkcq9vjhsp', network: 'Bitcoin Mainnet', minDeposit: 100, maxDeposit: 100000 },
    { currency: 'ETH', address: '0x38D80d6C99f53935c31A7e30222FEB4C2C3185ae', network: 'Ethereum Mainnet', minDeposit: 100, maxDeposit: 100000 },
    { currency: 'LTC', address: 'ltc1qhnq6kgvcy64tjsxugax8ttw7z87x3tdxel8pxm', network: 'Litecoin Mainnet', minDeposit: 100, maxDeposit: 100000 },
    { currency: 'XRP', address: 'rWAf25pP6eY5sDob1NsUNCCLfPDhDFXn3', network: 'XRP Ledger', minDeposit: 100, maxDeposit: 100000 },
    { currency: 'XLM', address: 'GBLK5SM3LTSNAL33M6ERXLCG3PQXTEC27BWG3CH2RJKWNHANIHTN4YG2', network: 'Stellar', minDeposit: 100, maxDeposit: 100000 },
    { currency: 'DOGE', address: 'DBeNuV12aj2nNoeUyDiWXf1GDGH74Z1SBx', network: 'Dogecoin Mainnet', minDeposit: 100, maxDeposit: 100000 },
    { currency: 'USDT-ERC20', address: '0x38D80d6C99f53935c31A7e30222FEB4C2C3185ae', network: 'Ethereum ERC20', minDeposit: 100, maxDeposit: 100000 },
    { currency: 'USDT-TRC20', address: 'TQ7nNiF2w2QzvgU2cQ81zpsMMw9CfCi5sN', network: 'Tron TRC20', minDeposit: 100, maxDeposit: 100000 },
    { currency: 'ALGO', address: '47BW32DIJH24TV7ULPCGHMRDWZXKVTENYEW4QJPVELIAULLMNPSUPAHXVA', network: 'Algorand', minDeposit: 100, maxDeposit: 100000 },
    { currency: 'MATIC', address: '0x38D80d6C99f53935c31A7e30222FEB4C2C3185ae', network: 'Polygon', minDeposit: 100, maxDeposit: 100000 },
    { currency: 'SOL', address: 'HhV3ydYWteQGxPPc3Atuj6qL1q4WWL7Ds4ogGxZZZP6n', network: 'Solana', minDeposit: 100, maxDeposit: 100000 },
    { currency: 'USDC', address: '0x38D80d6C99f53935c31A7e30222FEB4C2C3185ae', network: 'Ethereum ERC20', minDeposit: 100, maxDeposit: 100000 }
];

async function initializeWallets() {
    try {
        // Connect to MongoDB (use your actual connection string)
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qfs';
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing wallets (optional - remove if you want to keep existing data)
        // await WalletAddress.deleteMany({});
        // console.log('🗑️ Cleared existing wallets');

        let createdCount = 0;
        let updatedCount = 0;

        for (const walletData of defaultWallets) {
            const existingWallet = await WalletAddress.findOne({ currency: walletData.currency });
            
            if (existingWallet) {
                // Update existing wallet
                await WalletAddress.findOneAndUpdate(
                    { currency: walletData.currency },
                    { ...walletData, isActive: true },
                    { new: true }
                );
                updatedCount++;
                console.log(`🔄 Updated ${walletData.currency} wallet`);
            } else {
                // Create new wallet
                const wallet = new WalletAddress({
                    ...walletData,
                    isActive: true
                });
                await wallet.save();
                createdCount++;
                console.log(`✅ Created ${walletData.currency} wallet`);
            }
        }

        console.log('\n🎉 Wallet initialization completed!');
        console.log(`📊 Created: ${createdCount}, Updated: ${updatedCount}, Total: ${defaultWallets.length}`);

        // Display all wallets
        const allWallets = await WalletAddress.find().sort({ currency: 1 });
        console.log('\n📋 Current Wallet Addresses:');
        allWallets.forEach(wallet => {
            console.log(`   ${wallet.currency}: ${wallet.address.substring(0, 20)}... (${wallet.isActive ? 'Active' : 'Inactive'})`);
        });

    } catch (error) {
        console.error('❌ Error initializing wallets:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
        process.exit(0);
    }
}

// Run if this script is executed directly
if (require.main === module) {
    initializeWallets();
}

module.exports = initializeWallets;