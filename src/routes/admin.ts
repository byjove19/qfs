// src/routes/admin.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { 
  getDashboardStats,
  getUsers,
  getUserDetail,
  updateUser,
  adjustBalance,
  getAdminLogs
} from '../controllers/adminController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);
// router.use(requireSuperAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.get('/users/:id', getUserDetail);
router.put('/users/:id',
  [
    body('role').optional().isIn(['user', 'admin', 'superadmin']),
    body('isVerified').optional().isBoolean()
  ],
  updateUser
);
router.post('/users/:id/adjust-balance',
  [
    body('amount').isFloat({ min: 0.01 }),
    body('type').isIn(['add', 'subtract']),
    body('description').notEmpty().trim()
  ],
  adjustBalance
);
router.get('/logs', getAdminLogs);

export default router;