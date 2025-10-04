const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../config/multer');

// Profile routes
router.get('/profile', protect, getUserProfile);
router.post('/profile/update', protect, updateProfile);
router.post('/profile/change-password', protect, changePassword);
router.post('/profile/upload-avatar', protect, upload.single('avatar'), uploadProfilePicture);

module.exports = router;