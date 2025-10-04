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
      
      // Get basic data without complex queries for now
      const wallets = await Wallet.find({ userId });
      const recentTransactions = await Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5);

      const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

      // Render dashboard.ejs (not dashboard/index.ejs)
      res.render('dashboard', {
        title: 'Dashboard - QFS',
        user: user,
        wallets: wallets,
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
      res.render('profile', { // Changed from dashboard/profile to profile
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