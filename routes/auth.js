const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { attachUser, isAuthenticated } = require('../middleware/auth');

router.use(attachUser);

// Regular user routes ONLY
router.get('/login', authController.getLogin);
router.get('/register', authController.getRegister);

// Registration
router.post('/register', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], authController.register);

// Regular login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], authController.login);

// Logout - redirect to /logout instead
router.get('/logout', authController.logout);

// ADD PASSWORD VERIFICATION ROUTES
router.get('/verify-password', isAuthenticated, (req, res) => {
  res.render('auth/verify-password', {
    title: 'Verify Password - QFS',
    transaction: req.query.transaction === 'true',
    returnTo: req.session.returnTo || '/dashboard',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

router.post('/verify-password', isAuthenticated, [
  body('password').notEmpty().withMessage('Password is required')
], authController.verifyPassword);

module.exports = router;