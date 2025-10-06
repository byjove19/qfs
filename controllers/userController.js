// controllers/userController.js
const User = require('../models/User');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Email Service - with fallback for development
let emailService;
try {
  emailService = require('../services/emailService');
} catch (error) {
  console.warn('Email service not found. Using mock email service.');
  emailService = {
    sendVerificationEmail: async (user, token) => {
      console.log(`[MOCK] Verification email would be sent to ${user.email}`);
      console.log(`[MOCK] Verification token: ${token}`);
      return true;
    },
    sendVerificationResendEmail: async (user, token) => {
      console.log(`[MOCK] Verification resend email would be sent to ${user.email}`);
      console.log(`[MOCK] New verification token: ${token}`);
      return true;
    },
    sendWelcomeEmail: async (user) => {
      console.log(`[MOCK] Welcome email would be sent to ${user.email}`);
      return true;
    },
    sendPasswordResetEmail: async (user, token) => {
      console.log(`[MOCK] Password reset email would be sent to ${user.email}`);
      console.log(`[MOCK] Reset token: ${token}`);
      return true;
    },
    sendPromotionalEmail: async (user, promotion) => {
      console.log(`[MOCK] Promotional email would be sent to ${user.email}`);
      console.log(`[MOCK] Promotion:`, promotion);
      return true;
    }
  };
}

// @desc    Get user profile
// @route   GET /profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpires -verificationToken');
    
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

    // For API requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        message: 'Profile fetched successfully',
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          isVerified: user.isVerified,
          profilePicture: user.profilePicture,
          phone: user.phone,
          timezone: user.timezone,
          address: user.address
        },
        csrfToken: req.csrfToken()
      });
    }

    // For regular requests
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

// @desc    Verify user account
// @route   POST /profile/verify
// @access  Private
const verifyAccount = async (req, res) => {
  try {
    const { verificationCode } = req.body;
    
    if (!verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required'
      });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Account is already verified'
      });
    }

    // Check if verification code matches and is not expired
    if (!user.verificationToken || user.verificationToken !== verificationCode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    if (user.verificationExpires && user.verificationExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired'
      });
    }

    // Verify the user
    user.isVerified = true;
    user.verifiedAt = new Date();
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    // Update session
    req.session.user.isVerified = true;

    // Send welcome email after verification
    await emailService.sendWelcomeEmail(user);

    const response = {
      success: true,
      message: 'Account verified successfully! Welcome email sent.',
      data: {
        isVerified: true,
        verifiedAt: user.verifiedAt
      }
    };

    // Handle different response types
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(response);
    }

    req.flash('success', response.message);
    res.redirect('/profile');

  } catch (error) {
    console.error('Account verification error:', error);
    
    const errorResponse = {
      success: false,
      message: 'Verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    };

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json(errorResponse);
    }

    req.flash('error', errorResponse.message);
    res.redirect('/profile');
  }
};

// @desc    Resend verification email
// @route   POST /profile/resend-verification
// @access  Private
const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Account is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new verification token
    user.verificationToken = verificationToken;
    user.verificationExpires = verificationExpires;
    await user.save();

    // Send verification email
    await emailService.sendVerificationResendEmail(user, verificationToken);

    const response = {
      success: true,
      message: 'Verification email sent successfully! Please check your inbox.',
      development: process.env.NODE_ENV === 'development' ? { token: verificationToken } : undefined
    };

    // Handle different response types
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(response);
    }

    req.flash('success', 'Verification email sent successfully!');
    res.redirect('/profile');

  } catch (error) {
    console.error('Resend verification error:', error);
    
    const errorResponse = {
      success: false,
      message: 'Failed to resend verification email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    };

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json(errorResponse);
    }

    req.flash('error', errorResponse.message);
    res.redirect('/profile');
  }
};

// @desc    Get verification status
// @route   GET /profile/verification-status
// @access  Private
const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id)
      .select('isVerified verifiedAt verificationExpires');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const response = {
      success: true,
      data: {
        isVerified: user.isVerified,
        verifiedAt: user.verifiedAt,
        canResend: !user.isVerified && (!user.verificationExpires || user.verificationExpires < new Date())
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Get verification status error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get verification status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Initialize verification for new users
// @route   POST /profile/init-verification
// @access  Private
const initVerification = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If user is already verified, return success
    if (user.isVerified) {
      return res.json({
        success: true,
        message: 'User is already verified'
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with verification token
    user.verificationToken = verificationToken;
    user.verificationExpires = verificationExpires;
    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(user, verificationToken);

    const response = {
      success: true,
      message: 'Verification process initialized. Check your email.',
      development: process.env.NODE_ENV === 'development' ? { token: verificationToken } : undefined
    };

    res.json(response);

  } catch (error) {
    console.error('Init verification error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to initialize verification',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Forgot password - send reset email
// @route   POST /forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Send password reset email
    await emailService.sendPasswordResetEmail(user, resetToken);

    const response = {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      development: process.env.NODE_ENV === 'development' ? { resetToken } : undefined
    };

    res.json(response);

  } catch (error) {
    console.error('Forgot password error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Reset password with token
// @route   POST /reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, password, password_confirmation } = req.body;
    
    if (!token || !password || !password_confirmation) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password !== password_confirmation) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset token
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.updatedAt = new Date();
    await user.save();

    // Send confirmation email
    await emailService.sendPasswordResetEmail(user, null); // Send confirmation

    const response = {
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    };

    res.json(response);

  } catch (error) {
    console.error('Reset password error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Send promotional email to user
// @route   POST /profile/send-promotional-email
// @access  Private
const sendPromotionalEmail = async (req, res) => {
  try {
    const { subject, title, content, ctaUrl, ctaText } = req.body;
    
    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        message: 'Subject and content are required'
      });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const promotion = {
      subject,
      title: title || subject,
      content,
      ctaUrl,
      ctaText
    };

    await emailService.sendPromotionalEmail(user, promotion);

    const response = {
      success: true,
      message: 'Promotional email sent successfully'
    };

    res.json(response);

  } catch (error) {
    console.error('Send promotional email error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to send promotional email',
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

    // Update session
    req.session.user.firstName = updatedUser.firstName;
    req.session.user.lastName = updatedUser.lastName;

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
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate QR code data (user profile URL or custom data)
    const qrData = `${process.env.APP_URL || 'http://localhost:3000'}/user/${user._id}`;
    
    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(qrData);
    
    // Extract base64 data
    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
    
    // Generate filename
    const filename = `qrcode-${user._id}-${Date.now()}.png`;
    const filePath = path.join(__dirname, '../public/uploads/qrcodes', filename);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Save QR code image
    await fs.writeFile(filePath, base64Data, 'base64');
    
    // Update user with QR code path
    user.qrCode = `/uploads/qrcodes/${filename}`;
    user.updatedAt = new Date();
    await user.save();

    const response = {
      success: true,
      message: 'QR Code updated successfully',
      data: {
        qr_code_url: user.qrCode,
        qr_code_data_url: qrCodeDataURL
      }
    };

    res.json(response);
    
  } catch (error) {
    console.error('QR code update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Delete user account
// @route   DELETE /profile/delete-account
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const { confirmation } = req.body;
    
    if (confirmation !== 'DELETE') {
      return res.status(400).json({
        success: false,
        message: 'Please type DELETE to confirm account deletion'
      });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user account
    await User.findByIdAndDelete(req.session.user.id);

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      
      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    });

  } catch (error) {
    console.error('Delete account error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get user settings
// @route   GET /profile/settings
// @access  Private
const getUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id)
      .select('emailPreferences notifications timezone language');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        emailPreferences: user.emailPreferences || {
          promotional: true,
          security: true,
          updates: true
        },
        notifications: user.notifications || {
          email: true,
          push: false,
          sms: false
        },
        timezone: user.timezone || 'UTC',
        language: user.language || 'en'
      }
    });

  } catch (error) {
    console.error('Get user settings error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get user settings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update user settings
// @route   POST /profile/settings
// @access  Private
const updateUserSettings = async (req, res) => {
  try {
    const { emailPreferences, notifications, timezone, language } = req.body;
    
    const updateData = {
      updatedAt: new Date()
    };

    if (emailPreferences) updateData.emailPreferences = emailPreferences;
    if (notifications) updateData.notifications = notifications;
    if (timezone) updateData.timezone = timezone;
    if (language) updateData.language = language;

    const updatedUser = await User.findByIdAndUpdate(
      req.session.user.id,
      { $set: updateData },
      { new: true }
    ).select('emailPreferences notifications timezone language');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        emailPreferences: updatedUser.emailPreferences,
        notifications: updatedUser.notifications,
        timezone: updatedUser.timezone,
        language: updatedUser.language
      }
    });

  } catch (error) {
    console.error('Update user settings error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
// @desc    Change user default currency
// @route   POST /profile/change-default-currency
// @access  Private
const changeDefaultCurrency = async (req, res) => {
  try {
    const { currency } = req.body;
    
    // Validation
    if (!currency) {
      if (req.xhr) {
        return res.status(400).json({ 
          success: false, 
          message: 'Currency is required' 
        });
      }
      req.flash('error', 'Currency is required');
      return res.redirect('/profile');
    }

    // Validate currency against enum values
    const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'BTC', 'ETH', 'XRP', 'DOGE', 'LTC', 'ALGO', 'XDC', 'XLM', 'MATIC'];
    if (!validCurrencies.includes(currency)) {
      if (req.xhr) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid currency selected' 
        });
      }
      req.flash('error', 'Invalid currency selected');
      return res.redirect('/profile');
    }

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

    // Update currency
    user.currency = currency;
    user.updatedAt = new Date();
    await user.save();

    // Update session
    req.session.user.currency = currency;

    if (req.xhr) {
      return res.json({ 
        success: true, 
        message: 'Default currency updated successfully',
        data: {
          currency: currency
        }
      });
    }

    req.flash('success', 'Default currency updated successfully');
    res.redirect('/profile');
    
  } catch (error) {
    console.error('Currency change error:', error);
    
    if (req.xhr) {
      return res.status(500).json({ 
        success: false, 
        message: 'Currency change failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
    
    req.flash('error', 'Currency change failed');
    res.redirect('/profile');
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  updateQRCode,
  verifyAccount,
  resendVerification,
  getVerificationStatus,
  initVerification,
  forgotPassword,
  resetPassword,
  sendPromotionalEmail,
  deleteAccount,
  getUserSettings,
  updateUserSettings,
   changeDefaultCurrency
};