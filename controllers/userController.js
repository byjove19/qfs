// controllers/userController.js
const User = require('../models/User');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

// @desc    Get user profile
// @route   GET /profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    // Use req.session.user.id instead of req.user.id
    const user = await User.findById(req.session.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      if (req.xhr) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      return res.status(404).render('error/404', { 
        message: 'User not found'
      });
    }

    // For API requests - return minimal data without user object
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        message: 'Profile fetched successfully',
        csrfToken: req.csrfToken()
      });
    }

    // For regular requests - pass user to template but not in JSON response
    const responseData = {
      user: user,
   
      success: req.flash('success'),
      error: req.flash('error')
    };

    res.render('profile', responseData);
  } catch (error) {
    console.error('Get profile error:', error);
    
    if (req.xhr) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error fetching profile',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
    
    res.status(500).render('error/500', { 
      message: 'Error loading profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Upload profile picture
// @route   POST /profile/picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    console.log('Uploaded file details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename
    });

    // Use req.session.user.id instead of req.user.id
    const user = await User.findById(req.session.user.id);
    if (!user) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(console.error);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user with new profile picture
    const profilePicturePath = `/uploads/profiles/${req.file.filename}`;
    user.profilePicture = profilePicturePath;
    user.updatedAt = new Date();
    await user.save();

    // Also update session user profile picture
    req.session.user.profilePicture = profilePicturePath;

    const response = {
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        profile_image: profilePicturePath,
        profile_image_url: `${process.env.APP_URL || 'http://localhost:3000'}${profilePicturePath}`
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Profile picture upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
    if (!first_name?.trim() || !last_name?.trim()) {
      if (req.xhr) {
        return res.status(400).json({
          success: false,
          message: 'First name and last name are required'
        });
      }
      req.flash('error', 'First name and last name are required');
      return res.redirect('/profile');
    }

    const updateData = {
      firstName: first_name.trim(),
      lastName: last_name.trim(),
      phone: phone?.trim() || null,
      timezone: timezone || 'UTC',
      address: {
        street: address_1?.trim() || '',
        street2: address_2?.trim() || '',
        city: city?.trim() || '',
        state: state?.trim() || '',
        country: country_id || ''
      },
      updatedAt: new Date()
    };

    // Use req.session.user.id instead of req.user.id
    const updatedUser = await User.findByIdAndUpdate(
      req.session.user.id,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true
      }
    ).select('-password');

    if (!updatedUser) {
      if (req.xhr) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      req.flash('error', 'User not found');
      return res.redirect('/profile');
    }

    if (req.xhr) {
      return res.json({ 
        success: true, 
        message: 'Profile updated successfully'
      });
    }

    req.flash('success', 'Profile updated successfully');
    res.redirect('/profile');
    
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (req.xhr) {
      return res.status(500).json({ 
        success: false, 
        message: 'Update failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
    
    req.flash('error', 'Update failed');
    res.redirect('/profile');
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
      if (req.xhr) {
        return res.status(400).json({ 
          success: false, 
          message: 'All password fields are required' 
        });
      }
      req.flash('error', 'All password fields are required');
      return res.redirect('/profile');
    }

    if (password !== password_confirmation) {
      if (req.xhr) {
        return res.status(400).json({ 
          success: false, 
          message: 'New passwords do not match' 
        });
      }
      req.flash('error', 'New passwords do not match');
      return res.redirect('/profile');
    }

    if (password.length < 6) {
      if (req.xhr) {
        return res.status(400).json({ 
          success: false, 
          message: 'New password must be at least 6 characters long' 
        });
      }
      req.flash('error', 'New password must be at least 6 characters long');
      return res.redirect('/profile');
    }

    // Use req.session.user.id instead of req.user.id
    const user = await User.findById(req.session.user.id);
    if (!user) {
      if (req.xhr) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      req.flash('error', 'User not found');
      return res.redirect('/profile');
    }

    // Verify old password
    const isMatch = await user.comparePassword(old_password);
    if (!isMatch) {
      if (req.xhr) {
        return res.status(400).json({ 
          success: false, 
          message: 'Current password is incorrect' 
        });
      }
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/profile');
    }

    // Update password
    user.password = password;
    await user.save();

    if (req.xhr) {
      return res.json({ 
        success: true, 
        message: 'Password updated successfully' 
      });
    }

    req.flash('success', 'Password updated successfully');
    res.redirect('/profile');
    
  } catch (error) {
    console.error('Password change error:', error);
    
    if (req.xhr) {
      return res.status(500).json({ 
        success: false, 
        message: 'Password change failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
    
    req.flash('error', 'Password change failed');
    res.redirect('/profile');
  }
};

// @desc    Update QR code
// @route   POST /profile/update-qr-code
// @access  Private
const updateQRCode = async (req, res) => {
  try {
    // Implement QR code generation logic here
    res.json({
      success: true,
      message: 'QR Code updated successfully',
      qr_code_url: '/images/default-qr.png' // Placeholder
    });
    
  } catch (error) {
    console.error('QR code update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  updateQRCode
};