const User = require('../models/User');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');

// @desc    Get user profile
// @route   GET /profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('defaultWallet');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Generate QR code if doesn't exist
    if (!user.qrCode) {
      const qrData = `${process.env.APP_URL || 'http://localhost:3000'}/user/${user._id}`;
      const filename = `${user._id}_${Date.now()}.jpg`;
      const qrDir = path.join(__dirname, '../public/uploads/qrcodes');
      const qrPath = path.join(qrDir, filename);
      
      await fs.mkdir(qrDir, { recursive: true });
      await QRCode.toFile(qrPath, qrData, {
        errorCorrectionLevel: 'H',
        type: 'image/jpeg',
        quality: 0.92,
        margin: 1,
        width: 300
      });
      
      user.qrCode = `/uploads/qrcodes/${filename}`;
      await user.save();
    }

    res.render('profile', { user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching profile',
      error: error.message 
    });
  }
};

// @desc    Update user profile
// @route   POST /profile/update
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { 
      first_name, 
      last_name, 
      phone,
      address_1,
      address_2, 
      city, 
      state, 
      country_id, 
      timezone 
    } = req.body;
    
    // Validation
    if (!first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    const updateData = {
      firstName: first_name, 
      lastName: last_name, 
      phone,
      timezone: timezone || 'Asia/Dhaka',
      address: {
        street: address_1 || '',
        street2: address_2 || '',
        city: city || '',
        state: state || '',
        country: country_id || ''
      }
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Update failed',
      error: error.message 
    });
  }
};

// @desc    Change user password
// @route   POST /profile/update_password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { old_password, password, password_confirmation } = req.body;
    
    // Validation
    if (!old_password || !password || !password_confirmation) {
      return res.status(400).json({ 
        success: false, 
        message: 'All password fields are required' 
      });
    }

    if (password !== password_confirmation) {
      return res.status(400).json({ 
        success: false, 
        message: 'New passwords do not match' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long' 
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify old password
    const isMatch = await user.comparePassword(old_password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Update password (pre-save hook will hash it)
    user.password = password;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Password change failed',
      error: error.message 
    });
  }
};

// @desc    Upload profile picture
// @route   POST /profile/update-image
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only jpeg, png, bmp, gif, and svg are allowed'
      });
    }
    
    // Validate file size (5MB max)
    if (req.file.size > 5 * 1024 * 1024) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'File size must be less than 5MB'
      });
    }
    
    const user = await User.findById(req.user.id);

    if (!user) {
      await fs.unlink(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Delete old profile picture if exists and not default
    if (user.profilePicture && 
        user.profilePicture !== '/images/default-avatar.png' &&
        !user.profilePicture.includes('default')) {
      const oldPath = path.join(__dirname, '../public', user.profilePicture);
      await fs.unlink(oldPath).catch(() => {});
    }
    
    // Update user with new profile picture
    user.profilePicture = `/uploads/${req.file.filename}`;
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      profilePicture: user.profilePicture
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
};

// @desc    Update/Regenerate QR code
// @route   POST /profile/update-qr-code
// @access  Private
const updateQRCode = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Generate QR code data (user profile URL or payment link)
    const qrData = JSON.stringify({
      userId: user._id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      profileUrl: `${process.env.APP_URL || 'http://localhost:3000'}/user/${user._id}`,
      timestamp: Date.now()
    });
    
    // Generate unique filename
    const filename = `${user._id}_${Date.now()}.jpg`;
    const qrDir = path.join(__dirname, '../public/uploads/qrcodes');
    const qrPath = path.join(qrDir, filename);
    
    // Ensure directory exists
    await fs.mkdir(qrDir, { recursive: true });
    
    // Generate QR code
    await QRCode.toFile(qrPath, qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/jpeg',
      quality: 0.92,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Delete old QR code if exists
    if (user.qrCode) {
      const oldPath = path.join(__dirname, '../public', user.qrCode);
      await fs.unlink(oldPath).catch(() => {});
    }
    
    // Update user with new QR code path
    user.qrCode = `/uploads/qrcodes/${filename}`;
    await user.save();
    
    res.json({
      success: true,
      message: 'QR Code updated successfully',
      qr_code_url: user.qrCode
    });
  } catch (error) {
    console.error('QR code update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update QR code',
      error: error.message
    });
  }
};

// @desc    Change default wallet
// @route   POST /profile/change-default-currency
// @access  Private
const changeDefaultWallet = async (req, res) => {
  try {
    const { default_wallet } = req.body;
    
    if (!default_wallet) {
      return res.status(400).json({
        success: false,
        message: 'Wallet ID is required'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify wallet belongs to user (if you have a Wallet model)
    // const wallet = await Wallet.findOne({ _id: default_wallet, userId: user._id });
    // if (!wallet) {
    //   return res.status(404).json({
    //     success: false,
    //     message: 'Wallet not found or does not belong to you'
    //   });
    // }
    
    user.defaultWallet = default_wallet;
    await user.save();
    
    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('defaultWallet');
    
    res.json({
      success: true,
      message: 'Default wallet updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Default wallet update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update default wallet',
      error: error.message
    });
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  updateQRCode,
  changeDefaultWallet
};