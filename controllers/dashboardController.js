const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Investment = require('../models/Investment');
const Ticket = require('../models/Ticket');

const dashboardController = {
  getDashboard: async (req, res) => {
    try {
      const userId = req.session.user.id;
      
      // Get user data
      const user = await User.findById(userId);
      
      // Get user's existing wallets from database
      const userWallets = await Wallet.find({ userId });
      
      // Define ALL available currencies (same as wallet page)
      const allCurrencies = [
        { currency: 'USD', type: 'Fiat', isDefault: true },
        { currency: 'BTC', type: 'Crypto', isDefault: false },
        { currency: 'ETH', type: 'Crypto', isDefault: false },
        { currency: 'LTC', type: 'Crypto', isDefault: false },
        { currency: 'XRP', type: 'Crypto', isDefault: false },
        { currency: 'Doge', type: 'Crypto', isDefault: false },
        { currency: 'XDC', type: 'Crypto', isDefault: false },
        { currency: 'XLM', type: 'Crypto', isDefault: false },
        { currency: 'Matic', type: 'Crypto', isDefault: false },
        { currency: 'ALGO', type: 'Crypto', isDefault: false }
      ];

      // Create formatted wallets array with ALL currencies (including zero balances)
      const wallets = allCurrencies.map(currency => {
        // Find if user has an existing wallet for this currency
        const existingWallet = userWallets.find(wallet => wallet.currency === currency.currency);
        
        if (existingWallet) {
          // Use existing wallet data
          return {
            currency: existingWallet.currency,
            balance: existingWallet.balance || 0,
            isDefault: existingWallet.isDefault || currency.isDefault
          };
        } else {
          // Create wallet data for currencies that don't exist yet
          return {
            currency: currency.currency,
            balance: 0, // Zero balance for non-existent wallets
            isDefault: currency.isDefault
          };
        }
      });

      const recentTransactions = await Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5);

      const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

      // Render dashboard.ejs
      res.render('dashboard', {
        title: 'Dashboard - QFS',
        user: user,
        wallets: wallets, // This now includes ALL currencies
        totalBalance: totalBalance,
        recentTransactions: recentTransactions
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).render('error/500', { title: 'Server Error' });
    }
  },

  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.session.user.id);
      res.render('profile', {
        title: 'Profile - QFS',
        user
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).render('error/500', { title: 'Server Error' });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { firstName, lastName, phone, address } = req.body;
      const updateData = {
        firstName,
        lastName,
        phone,
        'address.street': address.street,
        'address.city': address.city,
        'address.state': address.state,
        'address.country': address.country,
        'address.zipCode': address.zipCode
      };

      if (req.file) {
        updateData.profilePicture = '/uploads/profiles/' + req.file.filename;
      }

      await User.findByIdAndUpdate(req.session.user.id, updateData);

      if (req.file) {
        req.session.user.profilePicture = '/uploads/profiles/' + req.file.filename;
      }

      req.flash('success', 'Profile updated successfully!');
      res.redirect('/profile');
    } catch (error) {
      console.error('Profile update error:', error);
      req.flash('error', 'Failed to update profile');
      res.redirect('/profile');
    }
  }
};

module.exports = dashboardController;