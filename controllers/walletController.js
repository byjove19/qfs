const Wallet = require('../models/Wallet');

exports.getWalletPage = async (req, res) => {
    try {
        // Check if user is authenticated and has session data
        if (!req.session.user) {
            req.flash('error', 'Please log in to access your wallet');
            return res.redirect('/auth/login');
        }

        const userId = req.session.user._id || req.session.user.id;
        
        if (!userId) {
            req.flash('error', 'Session expired. Please log in again');
            return res.redirect('/auth/login');
        }

        console.log('Fetching wallets for user ID:', userId);

        // Fetch user's existing wallets from database
        const userWallets = await Wallet.find({ userId: userId });
        
        console.log('Found existing wallets:', userWallets.length);

        // Define ALL available currencies (master list) - USE UPPERCASE to match Wallet model
        const allCurrencies = [
            { currency: 'USD', type: 'Fiat', isDefault: true },
            { currency: 'BTC', type: 'Crypto', isDefault: false },
            { currency: 'ETH', type: 'Crypto', isDefault: false },
            { currency: 'LTC', type: 'Crypto', isDefault: false },
            { currency: 'XRP', type: 'Crypto', isDefault: false },
            { currency: 'STRAWMAN', type: 'Crypto', isDefault: false }, // Changed from 'STRAWMAN' to 'STRAWMAN'
            { currency: 'XDC', type: 'Crypto', isDefault: false },
            { currency: 'XLM', type: 'Crypto', isDefault: false },
            { currency: 'MATIC', type: 'Crypto', isDefault: false }, // Changed from 'Matic' to 'MATIC'
            { currency: 'ALGO', type: 'Crypto', isDefault: false }
        ];

        // Define wallet images (keep original keys for image lookup)
        const walletImages = {
            'USD': '/Wallet List _ QFS_files/icons8-us-dollar-64.png',
            'BTC': '/Wallet List _ QFS_files/1698103759.png',
            'ETH': '/Wallet List _ QFS_files/1698011100.png',
            'LTC': '/Wallet List _ QFS_files/1698103966.png',
            'XRP': '/Wallet List _ QFS_files/1698104378.png',
            'STRAWMAN': '/Wallet List _ QFS_files/strawman.jpg', // Updated key
            'XDC': '/Wallet List _ QFS_files/1698104836.png',
            'XLM': '/Wallet List _ QFS_files/1698104729.png',
            'MATIC': '/Wallet List _ QFS_files/1698104560.png', // Updated key
            'ALGO': '/Wallet List _ QFS_files/1698105102.png'
        };

        // Create formatted wallets array with ALL currencies
        const formattedWallets = allCurrencies.map(currency => {
            // Find if user has an existing wallet for this currency
            const existingWallet = userWallets.find(wallet => wallet.currency === currency.currency);
            
            if (existingWallet) {
                // Use existing wallet data
                return {
                    currency: existingWallet.currency,
                    type: existingWallet.currency === 'USD' ? 'Fiat' : 'Crypto',
                    balance: existingWallet.balance || 0,
                    isDefault: existingWallet.isDefault || currency.isDefault,
                    image: walletImages[existingWallet.currency] || '/Wallet List _ QFS_files/icons8-us-dollar-64.png',
                    lastAction: {
                        amount: existingWallet.lastAction && existingWallet.lastAction.amount > 0 ? 
                            `$ ${existingWallet.lastAction.amount.toLocaleString()}` : null,
                        type: existingWallet.lastAction && existingWallet.lastAction.type !== 'No transaction available.' ? 
                            existingWallet.lastAction.type : null
                    }
                };
            } else {
                // Create wallet data for currencies that don't exist yet
                return {
                    currency: currency.currency,
                    type: currency.type,
                    balance: 0, // Zero balance for non-existent wallets
                    isDefault: currency.isDefault,
                    image: walletImages[currency.currency] || '/Wallet List _ QFS_files/icons8-us-dollar-64.png',
                    lastAction: {
                        amount: null,
                        type: null
                    }
                };
            }
        });

        // Auto-create missing wallets in database with CORRECT currency codes
        const missingWallets = allCurrencies.filter(currency => 
            !userWallets.some(wallet => wallet.currency === currency.currency)
        );

        if (missingWallets.length > 0) {
            console.log('Auto-creating missing wallets:', missingWallets.map(w => w.currency));
            
            try {
                const walletsToCreate = missingWallets.map(currency => ({
                    userId: userId,
                    currency: currency.currency, // This now uses correct uppercase codes
                    balance: 0,
                    isDefault: currency.isDefault,
                    lastAction: {
                        amount: 0,
                        type: 'No transaction available.'
                    }
                }));

                await Wallet.insertMany(walletsToCreate);
                console.log('Successfully created missing wallets');
            } catch (createError) {
                console.error('Error auto-creating missing wallets:', createError);
                // Continue even if creation fails - users will still see all currencies
            }
        }

        res.render('wallet', { 
            wallets: formattedWallets,
            user: req.session.user
        });

    } catch (error) {
        console.error('Error fetching wallet data:', error);
        req.flash('error', 'Failed to load wallet data');
        res.redirect('/dashboard');
    }
};

// Alternative method to get user ID safely
const getUserId = (req) => {
    if (!req.session.user) return null;
    return req.session.user._id || req.session.user.id;
};