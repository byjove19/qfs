// src/routes/auth.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { 
  register, 
  login, 
  verifyEmail, 
  getProfile, 
  updateProfile 
} from '../controllers/authController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', 
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').notEmpty().trim().isLength({ min: 2 }),
    body('lastName').notEmpty().trim().isLength({ min: 2 }),
    body('phone').optional().trim(),
    // Make optional fields for now - users can fill them in profile later
    body('dateOfBirth').optional().isDate(),
    body('address').optional().trim(),
    body('city').optional().trim(),
    body('country').optional().trim(),
    body('postalCode').optional().trim()
  ],
  register
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  login
);

router.get('/verify-email', verifyEmail);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

export default router;