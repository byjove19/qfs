// src/routes/dispute.ts
import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { 
  createDispute,
  getDisputes,
  getDispute,
  addDisputeEvidence,
  getAdminDisputes,
  resolveDispute
} from '../controllers/disputeController';
import { authenticate, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();
const upload = multer({ dest: 'public/uploads/disputes/' });

// User routes
router.use(authenticate);

router.post('/',
  upload.array('evidence', 10),
  [
    body('transactionId').isMongoId(),
    body('reason').isIn(['unauthorized', 'not-received', 'wrong-amount', 'other']),
    body('description').notEmpty().trim()
  ],
  createDispute
);
router.get('/', getDisputes);
router.get('/:id', getDispute);
router.post('/:id/evidence',
  upload.array('evidence', 10),
  addDisputeEvidence
);

// Admin routes
router.get('/admin/disputes', requireAdmin, getAdminDisputes);
router.post('/admin/disputes/:id/resolve', requireAdmin,
  [
    body('resolution').notEmpty().trim(),
    body('refundAmount').optional().isFloat({ min: 0 })
  ],
  resolveDispute
);

export default router;