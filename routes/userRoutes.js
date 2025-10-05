
// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth'); // Changed from 'protect'
const { 
  uploadProfile
} = require('../config/multer');
const {
  getUserProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  updateQRCode
} = require('../controllers/userController');

// Apply isAuthenticated middleware to all routes
router.use(isAuthenticated); // Changed from 'protect'

// Profile routes
router.get('/', getUserProfile);
router.post('/update', updateProfile);
router.post('/update_password', changePassword);
router.post('/picture', uploadProfile, uploadProfilePicture);
router.post('/update-qr-code', updateQRCode);

// Remove these duplicate API routes to avoid conflicts
// router.get('/api', getUserProfile);
// router.post('/api/update', updateProfile);
// router.post('/api/password', changePassword);
// router.post('/api/picture', uploadProfile, uploadProfilePicture);
// router.post('/api/qr-code', updateQRCode);

module.exports = router;