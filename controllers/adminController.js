const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Ticket = require('../models/Ticket');

const adminController = {
  getDashboard: async (req, res) => {
    try {
      const [
        totalUsers,
        totalTransactions,
        pendingTransactions,
        openTickets,
        recentUsers
      ] = await Promise.all([
        User.countDocuments(),
        Transaction.countDocuments(),
        Transaction.countDocuments({ status: 'pending' }),
        Ticket.countDocuments({ status: 'open' }),
        User.find().sort({ createdAt: -1 }).limit(5)
      ]);

      res.render('admin/dashboard', {
        title: 'Admin Dashboard - QFS',
        totalUsers,
        totalTransactions,
        pendingTransactions,
        openTickets,
        recentUsers
      });
    } catch (error) {
      console.error('Admin dashboard error:', error);
      res.status(500).render('error/500', { title: 'Server Error' });
    }
  },

  getUsers: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select('-password'),
        User.countDocuments()
      ]);

      res.render('admin/users', {
        title: 'Manage Users - QFS',
        users,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('Admin users error:', error);
      res.status(500).render('error/500', { title: 'Server Error' });
    }
  },

  getUserDetail: async (req, res) => {
    try {
      const userId = req.params.id;
      
      const [user, wallets, transactions, tickets] = await Promise.all([
        User.findById(userId).select('-password'),
        Wallet.find({ userId }),
        Transaction.find({ userId }).sort({ createdAt: -1 }).limit(10),
        Ticket.find({ userId }).sort({ createdAt: -1 }).limit(5)
      ]);

      if (!user) {
        return res.status(404).render('error/404', { title: 'User Not Found' });
      }

      res.render('admin/user-detail', {
        title: `User: ${user.firstName} ${user.lastName} - QFS`,
        user,
        wallets,
        transactions,
        tickets
      });
    } catch (error) {
      console.error('Admin user detail error:', error);
      res.status(500).render('error/500', { title: 'Server Error' });
    }
  },

  updateUserBalance: async (req, res) => {
    try {
      const { userId, currency, amount, type } = req.body;

      let wallet = await Wallet.findOne({ userId, currency });
      if (!wallet) {
        wallet = new Wallet({
          userId,
          currency,
          balance: 0
        });
      }

      if (type === 'add') {
        wallet.balance += parseFloat(amount);
      } else if (type === 'subtract') {
        wallet.balance = Math.max(0, wallet.balance - parseFloat(amount));
      }

      await wallet.save();

      // Create transaction record
      const transaction = new Transaction({
        userId,
        walletId: wallet._id,
        type: type === 'add' ? 'deposit' : 'withdrawal',
        method: 'manual',
        amount: parseFloat(amount),
        currency,
        status: 'completed',
        description: `Admin ${type} balance`
      });

      await transaction.save();

      req.flash('success', `Successfully updated user balance`);
      res.redirect(`/admin/users/${userId}`);
    } catch (error) {
      console.error('Update balance error:', error);
      req.flash('error', 'Failed to update balance');
      res.redirect(`/admin/users/${req.body.userId}`);
    }
  },

  getTransactions: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        Transaction.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'firstName lastName email')
          .populate('recipientId', 'firstName lastName email'),
        Transaction.countDocuments()
      ]);

      res.render('admin/transactions', {
        title: 'Manage Transactions - QFS',
        transactions,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('Admin transactions error:', error);
      res.status(500).render('error/500', { title: 'Server Error' });
    }
  },

  updateTransactionStatus: async (req, res) => {
    try {
      const { transactionId, status } = req.body;
      
      const transaction = await Transaction.findByIdAndUpdate(
        transactionId,
        { status },
        { new: true }
      ).populate('userId', 'firstName lastName email');

      if (!transaction) {
        req.flash('error', 'Transaction not found');
        return res.redirect('/admin/transactions');
      }

      // If withdrawal is approved, update wallet balance
      if (transaction.type === 'withdrawal' && status === 'completed') {
        const wallet = await Wallet.findById(transaction.walletId);
        if (wallet) {
          wallet.balance -= transaction.amount;
          await wallet.save();
        }
      }

      req.flash('success', `Transaction status updated to ${status}`);
      res.redirect('/admin/transactions');
    } catch (error) {
      console.error('Update transaction status error:', error);
      req.flash('error', 'Failed to update transaction status');
      res.redirect('/admin/transactions');
    }
  }
};

module.exports = adminController;