// src/routes/dashboard.ts
import { Router } from 'express';
import { 
  getDashboard, 
  getDashboardStats, 
  getNotifications,
  markNotificationAsRead,
  dismissNotification,
  getQuickActions
} from '../controllers/dashboardController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Main dashboard page
router.get('/', authenticate, getDashboard);

// API endpoints for dashboard components
router.get('/stats', authenticate, getDashboardStats);
router.get('/notifications', authenticate, getNotifications);
router.get('/quick-actions', authenticate, getQuickActions);
router.put('/notifications/:notificationId/read', authenticate, markNotificationAsRead);
router.put('/notifications/:notificationId/dismiss', authenticate, dismissNotification);

export default router;