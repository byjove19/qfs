// src/controllers/dashboardController.ts
import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import { DashboardService } from '../services/dashboardService';
import User from '../models/User';

const getUserId = (req: AuthRequest): Types.ObjectId => {
  if (!req.user || !req.user._id) {
    throw new Error('User not authenticated');
  }

  if (typeof req.user._id === 'string') {
    return new Types.ObjectId(req.user._id);
  }

  return req.user._id as Types.ObjectId;
};

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    console.log('=== DASHBOARD CONTROLLER START ===');

    // Try restoring user from session/token if not in req.user
    if (!req.user) {
      const token = req.cookies?.token || (req.session as any)?.token;
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const config = require('../config/env').default;
          const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
          const foundUser = await User.findById(decoded.userId);
          if (foundUser) req.user = foundUser;
        } catch (error) {
          console.log('Token verification failed:', error);
        }
      }
    }

    if (!req.user) {
      return res.redirect('/login?error=authentication_required');
    }

    const userId = getUserId(req);

    // Record dashboard activity
    await DashboardService.recordUserActivity(
      userId,
      'page_view',
      'User accessed dashboard',
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    );

    const dashboardData = await DashboardService.getDashboardData(userId);

    // FIX: Create user object with proper structure
    const userData = {
      _id: req.user._id,
      firstName: req.user.firstName || 'User',
      lastName: req.user.lastName || '',
      email: req.user.email || '',
      avatar: req.user.avatar || 'default-avatar.png',
      role: req.user.role || 'user',
      isVerified: req.user.isVerified || false
    };

    // FIX: Pass all required variables to the template
    res.render('dashboard', {
      title: 'Dashboard',
      user: userData, // ✅ This fixes the error
      wallets: dashboardData.wallets || { list: [], totalBalance: 0 },
      notifications: dashboardData.notifications || { list: [], unreadCount: 0 },
      quickActions: dashboardData.quickActions || [],
      recentTransactions: dashboardData.recentTransactions || { list: [], stats: {} },
      investmentStats: dashboardData.investmentStats || {
        list: [],
        totalInvested: 0,
        totalReturns: 0,
        activeInvestments: 0
      },
      currentPath: '/dashboard',
    });

    console.log('=== DASHBOARD CONTROLLER END ===');
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Internal server error',
      error: { status: 500 }
    });
  }
};

// ===================== STUB CONTROLLERS =====================

// Dashboard stats (JSON API)
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const stats = await DashboardService.getDashboardStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Notifications list
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const notifications = await DashboardService.getNotifications(userId);
    res.json(notifications);
  } catch (error) {
    console.error('getNotifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { notificationId } = req.params;
    const notificationObjectId = new Types.ObjectId(notificationId);
    await DashboardService.markNotificationAsRead(notificationObjectId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('markNotificationAsRead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Dismiss notification
export const dismissNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { notificationId } = req.params;
    const notificationObjectId = new Types.ObjectId(notificationId);
    await DashboardService.dismissNotification(notificationObjectId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('dismissNotification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Quick actions
export const getQuickActions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const actions = await DashboardService.getQuickActions(userId);
    res.json(actions);
  } catch (error) {
    console.error('getQuickActions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
