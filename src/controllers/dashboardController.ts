import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import { DashboardService } from '../services/dashboardService';

// Helper function to safely get user ID
const getUserId = (req: AuthRequest): Types.ObjectId => {
  if (!req.user || !req.user._id) {
    throw new Error('User not authenticated');
  }
  
  // Convert to ObjectId if it's a string, or return as is if already ObjectId
  if (typeof req.user._id === 'string') {
    return new Types.ObjectId(req.user._id);
  }
  
  return req.user._id as Types.ObjectId;
};

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    // Record dashboard view activity
    await DashboardService.recordUserActivity(
      userId,
      'login',
      'User accessed dashboard',
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    );

    // Get comprehensive dashboard data
    const dashboardData = await DashboardService.getDashboardData(userId);

    res.render('dashboard/index', {
      title: 'Dashboard',
      user: req.user,
      ...dashboardData,
      currentPath: '/dashboard',
      success: (req as any).flash ? (req as any).flash('success') : [],
      error: (req as any).flash ? (req as any).flash('error') : []
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Internal server error',
      error: { status: 500 }
    });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const stats = await DashboardService.getDashboardStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { limit = 10 } = req.query;
    const notifications = await DashboardService.getNotifications(
      userId, 
      Number(limit)
    );
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { notificationId } = req.params;
    
    // Validate notificationId
    if (!Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }
    
    const notification = await DashboardService.markNotificationAsRead(
      new Types.ObjectId(notificationId),
      userId
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const dismissNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { notificationId } = req.params;
    
    // Validate notificationId
    if (!Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }
    
    const notification = await DashboardService.dismissNotification(
      new Types.ObjectId(notificationId),
      userId
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification dismissed',
      data: { notification }
    });
  } catch (error) {
    console.error('Dismiss notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getQuickActions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const quickActions = await DashboardService.getQuickActions(userId);
    
    res.json({
      success: true,
      data: quickActions
    });
  } catch (error) {
    console.error('Get quick actions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};