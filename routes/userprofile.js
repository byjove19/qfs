const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../config/multer');
const {
  getUserProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  updateQRCode,
  changeDefaultWallet
} = require('../controllers/userController');

// Profile routes
router.get('/profile', protect, getUserProfile);
router.post('/profile/update', protect, updateProfile);
router.post('/profile/update_password', protect, changePassword);
router.post('/profile/update-image', protect, upload.single('file'), uploadProfilePicture);
router.post('/profile/update-qr-code', protect, updateQRCode);
router.post('/profile/change-default-currency', protect, changeDefaultWallet);

module.exports = router;