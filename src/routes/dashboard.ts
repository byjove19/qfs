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
import { webAuthenticate, authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Main dashboard page - web auth (redirects to login if not authenticated)
router.get('/', webAuthenticate, getDashboard);

// API endpoints - API auth (returns JSON if not authenticated)
router.get('/stats', authenticate, getDashboardStats);
router.get('/notifications', authenticate, getNotifications);
router.get('/quick-actions', authenticate, getQuickActions);
router.put('/notifications/:notificationId/read', authenticate, markNotificationAsRead);
router.put('/notifications/:notificationId/dismiss', authenticate, dismissNotification);

export default router;
