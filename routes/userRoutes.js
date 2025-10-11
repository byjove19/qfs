// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { 
  uploadProfile
} = require('../config/multer');
const {
  getUserProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  updateQRCode,
  verifyAccount,
  resendVerification,
  getVerificationStatus,
  changeDefaultCurrency
} = require('../controllers/userController');

// Apply isAuthenticated middleware to all routes
router.use(isAuthenticated);

// Profile routes - authentication runs first, then multer, then controller
router.get('/', getUserProfile);
router.post('/update', updateProfile);
router.post('/update_password', changePassword); // Fixed: removed duplicate line
router.post('/picture', uploadProfile, uploadProfilePicture);
router.post('/update-qr-code', updateQRCode);
router.post('/change-default-currency', changeDefaultCurrency);

// Verification routes
router.post('/verify', verifyAccount);
router.post('/resend-verification', resendVerification);
router.get('/verification-status', getVerificationStatus);

module.exports = router;