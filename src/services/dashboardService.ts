import { Types, Document } from 'mongoose';
import Wallet, { IWallet } from '../models/Wallet';
import Transaction from '../models/Transaction';
import Investment from '../models/Investment';
import DashboardStats from '../models/DashboardStats';
import UserActivity from '../models/UserActivity';
import Notification from '../models/Notification';
import QuickAction from '../models/QuickAction';

// Define proper types for Mongoose documents
type WalletDocument = IWallet & {
  _id: Types.ObjectId;
  __v: number;
};

type TransactionDocument = Document<unknown, {}, any> & {
  _id: Types.ObjectId;
  __v: number;
};

type InvestmentDocument = Document<unknown, {}, any> & {
  _id: Types.ObjectId;
  __v: number;
};

export class DashboardService {
  
  // Get comprehensive dashboard data
  static async getDashboardData(userId: Types.ObjectId) {
    const [
      wallets,
      recentTransactions,
      investmentStats,
      quickActions,
      notifications,
      recentActivities,
      dashboardStats
    ] = await Promise.all([
      this.getUserWallets(userId),
      this.getRecentTransactions(userId),
      this.getInvestmentStats(userId),
      this.getQuickActions(userId),
      this.getNotifications(userId),
      this.getRecentActivities(userId),
      this.getDashboardStats(userId)
    ]);

    return {
      wallets,
      recentTransactions,
      investmentStats,
      quickActions,
      notifications,
      recentActivities,
      dashboardStats
    };
  }

  // Get user wallets with additional info
  static async getUserWallets(userId: Types.ObjectId) {
    const wallets = await Wallet.find({ user: userId, isActive: true })
      .sort({ createdAt: 1 });

    // Calculate total balance across all wallets
    const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

    // Use proper type assertion - since IWallet already extends Document
    const walletList = wallets as WalletDocument[];
    
    // Since your model doesn't have isDefault, use the first wallet or find by currency
    // You can modify this logic based on your business rules
    const defaultWallet = walletList.find(w => w.currency === 'USD') || walletList[0];

    return {
      list: walletList,
      totalBalance,
      currencyCount: wallets.length,
      defaultWallet
    };
  }

  // Get recent transactions
  static async getRecentTransactions(userId: Types.ObjectId, limit: number = 10) {
    const transactions = await Transaction.find({ user: userId })
      .populate('metadata.recipient', 'firstName lastName email')
      .populate('metadata.sender', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Calculate transaction statistics
    const stats = await Transaction.aggregate([
      { $match: { user: userId, status: 'completed' } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: { $abs: '$amount' } }
        }
      }
    ]);

    const transactionStats = {
      total: transactions.length,
      byType: stats.reduce((acc, stat) => {
        acc[stat._id] = { count: stat.count, totalAmount: stat.totalAmount };
        return acc;
      }, {} as any)
    };

    return {
      list: transactions,
      stats: transactionStats
    };
  }

  // Get investment statistics
  static async getInvestmentStats(userId: Types.ObjectId) {
    const investments = await Investment.find({ user: userId })
      .populate('transaction')
      .sort({ createdAt: -1 });

    const stats = await Investment.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalReturns: { $sum: '$actualReturn' }
        }
      }
    ]);

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalReturns = investments.reduce((sum, inv) => sum + (inv.actualReturn || 0), 0);
    const activeInvestments = investments.filter(inv => inv.status === 'active').length;

    return {
      list: investments.slice(0, 5), // Last 5 investments
      totalInvested,
      totalReturns,
      activeInvestments,
      performance: totalInvested > 0 ? ((totalReturns / totalInvested) * 100) : 0,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount,
          totalReturns: stat.totalReturns
        };
        return acc;
      }, {} as any)
    };
  }

  // Get quick actions for user
  static async getQuickActions(userId: Types.ObjectId) {
    const defaultActions = [
      {
        actionType: 'deposit',
        title: 'Deposit Money',
        description: 'Add funds to your account',
        icon: 'fas fa-arrow-down',
        url: '/deposit',
        color: '#635BFE',
        order: 1
      },
      {
        actionType: 'send',
        title: 'Send Money',
        description: 'Transfer money to others',
        icon: 'fas fa-paper-plane',
        url: '/send',
        color: '#FFAF30',
        order: 2
      },
      {
        actionType: 'request',
        title: 'Request Money',
        description: 'Request payment from others',
        icon: 'fas fa-hand-holding-usd',
        url: '/request',
        color: '#18C139',
        order: 3
      },
      {
        actionType: 'exchange',
        title: 'Exchange',
        description: 'Convert between currencies',
        icon: 'fas fa-sync-alt',
        url: '/exchange',
        color: '#E74C3C',
        order: 4
      },
      {
        actionType: 'invest',
        title: 'Invest',
        description: 'Grow your money',
        icon: 'fas fa-chart-line',
        url: '/investment',
        color: '#9B59B6',
        order: 5
      },
      {
        actionType: 'support',
        title: 'Support',
        description: 'Get help & support',
        icon: 'fas fa-headset',
        url: '/tickets/create',
        color: '#3498DB',
        order: 6
      }
    ];

    // Check if user has custom quick actions
    let userActions = await QuickAction.find({ 
      user: userId, 
      isActive: true 
    }).sort({ order: 1 });

    // If no custom actions, create default ones
    if (userActions.length === 0) {
      const actionsToCreate = defaultActions.map(action => ({
        ...action,
        user: userId
      }));
      
      userActions = await QuickAction.insertMany(actionsToCreate);
    }

    return userActions;
  }

  // Get user notifications
  static async getNotifications(userId: Types.ObjectId, limit: number = 5) {
    const notifications = await Notification.find({
      user: userId,
      status: { $in: ['unread', 'read'] },
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: { $exists: false } }
      ]
    })
    .sort({ isImportant: -1, createdAt: -1 })
    .limit(limit);

    const unreadCount = await Notification.countDocuments({
      user: userId,
      status: 'unread'
    });

    return {
      list: notifications,
      unreadCount
    };
  }

  // Get recent user activities
  static async getRecentActivities(userId: Types.ObjectId, limit: number = 10) {
    const activities = await UserActivity.find({ user: userId })
      .populate('metadata.transactionId')
      .populate('metadata.investmentId')
      .populate('metadata.recipient', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit);

    return activities;
  }

  // Get dashboard statistics
  static async getDashboardStats(userId: Types.ObjectId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Get or create today's stats
    let todayStats = await DashboardStats.findOne({
      user: userId,
      period: 'daily',
      date: today
    });

    if (!todayStats) {
      todayStats = await this.generateDailyStats(userId, today);
    }

    // Get weekly and monthly stats
    const [weeklyStats, monthlyStats] = await Promise.all([
      DashboardStats.findOne({
        user: userId,
        period: 'weekly',
        date: { $gte: oneWeekAgo }
      }).sort({ date: -1 }),
      DashboardStats.findOne({
        user: userId,
        period: 'monthly',
        date: { $gte: oneMonthAgo }
      }).sort({ date: -1 })
    ]);

    return {
      daily: todayStats,
      weekly: weeklyStats,
      monthly: monthlyStats
    };
  }

  // Generate daily statistics
  static async generateDailyStats(userId: Types.ObjectId, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get transactions for the day
    const dailyTransactions = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: { $abs: '$amount' } }
        }
      }
    ]);

    // Get wallet balances
    const wallets = await Wallet.find({ user: userId, isActive: true });
    const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

    // Calculate stats
    const stats = dailyTransactions.reduce((acc, transaction) => {
      if (transaction._id === 'deposit') {
        acc.totalDeposits = transaction.totalAmount;
        acc.depositCount = transaction.count;
      } else if (transaction._id === 'withdrawal') {
        acc.totalWithdrawals = transaction.totalAmount;
        acc.withdrawalCount = transaction.count;
      } else if (transaction._id === 'send') {
        acc.totalSent = transaction.totalAmount;
        acc.sendCount = transaction.count;
      } else if (transaction._id === 'receive') {
        acc.totalReceived = transaction.totalAmount;
        acc.receiveCount = transaction.count;
      }
      return acc;
    }, {
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalSent: 0,
      totalReceived: 0,
      depositCount: 0,
      withdrawalCount: 0,
      sendCount: 0,
      receiveCount: 0
    });

    const transactionCount = dailyTransactions.reduce((sum, t) => sum + t.count, 0);
    const netFlow = (stats.totalDeposits + stats.totalReceived) - (stats.totalWithdrawals + stats.totalSent);

    // Create dashboard stats record
    const dashboardStats = new DashboardStats({
      user: userId,
      period: 'daily',
      date: startOfDay,
      totalBalance,
      ...stats,
      transactionCount,
      netFlow,
      growthRate: 0,
      activityScore: this.calculateActivityScore(transactionCount, netFlow)
    });

    return await dashboardStats.save();
  }

  // Calculate user activity score
  static calculateActivityScore(transactionCount: number, netFlow: number): number {
    const transactionScore = Math.min(transactionCount * 10, 50);
    const flowScore = netFlow > 0 ? Math.min(netFlow / 100, 50) : 0;
    return Math.min(transactionScore + flowScore, 100);
  }

  // Record user activity
  static async recordUserActivity(
    userId: Types.ObjectId, 
    type: string, 
    description: string, 
    ipAddress: string, 
    userAgent: string,
    metadata: any = {}
  ) {
    const activity = new UserActivity({
      user: userId,
      type: type as any,
      description,
      ipAddress,
      userAgent,
      metadata
    });

    return await activity.save();
  }

  // Create notification
  static async createNotification(
    userId: Types.ObjectId,
    type: string,
    title: string,
    message: string,
    options: {
      actionUrl?: string;
      actionText?: string;
      isImportant?: boolean;
      expiresAt?: Date;
    } = {}
  ) {
    const notification = new Notification({
      user: userId,
      type: type as any,
      title,
      message,
      actionUrl: options.actionUrl,
      actionText: options.actionText,
      isImportant: options.isImportant || false,
      expiresAt: options.expiresAt
    });

    return await notification.save();
  }

  // Mark notification as read
  static async markNotificationAsRead(notificationId: Types.ObjectId, userId: Types.ObjectId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { 
        status: 'read',
        readAt: new Date()
      },
      { new: true }
    );
  }

  // Dismiss notification
  static async dismissNotification(notificationId: Types.ObjectId, userId: Types.ObjectId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { status: 'dismissed' },
      { new: true }
    );
  }
}