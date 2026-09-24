// controllers/userController.js
const User = require('../models/User');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// ✅ Email Service — points to utils/emailService.js
const emailService = require('../utils/emailService');

// ============================================================
//  GET USER PROFILE
//  @route   GET /profile
//  @access  Private
// ============================================================
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpires -verificationToken');

    if (!user) {
      if (req.xhr) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      return res.status(404).render('error/404', { message: 'User not found' });
    }

    // API response
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
        csrfToken: req.csrfToken ? req.csrfToken() : null
      });
    }

    // Page response
    res.render('profile', {
      user: user,
      success: req.flash('success'),
      error: req.flash('error')
    });
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

// ============================================================
//  VERIFY ACCOUNT
//  @route   POST /profile/verify
//  @access  Private
// ============================================================
const verifyAccount = async (req, res) => {
  try {
    const { verificationCode } = req.body;

    if (!verificationCode) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Account is already verified' });
    }

    if (!user.verificationToken || user.verificationToken !== verificationCode.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    if (user.verificationExpires && user.verificationExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired' });
    }

    // Verify user
    user.isVerified = true;
    user.verifiedAt = new Date();
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    req.session.user.isVerified = true;

    // ✅ Send welcome email
    try {
      await emailService.sendWelcomeEmail(user);
    } catch (emailErr) {
      console.error('Welcome email failed (non-blocking):', emailErr.message);
    }

    const response = {
      success: true,
      message: 'Account verified successfully! Welcome email sent.',
      data: { isVerified: true, verifiedAt: user.verifiedAt }
    };

    if (req.xhr || req.headers.accept.indexOf('json') > -1) return res.json(response);

    req.flash('success', response.message);
    res.redirect('/profile');
  } catch (error) {
    console.error('Account verification error:', error);
    const errorResponse = {
      success: false,
      message: 'Verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    };
    if (req.xhr || req.headers.accept.indexOf('json') > -1) return res.status(500).json(errorResponse);
    req.flash('error', errorResponse.message);
    res.redirect('/profile');
  }
};

// ============================================================
//  RESEND VERIFICATION EMAIL
//  @route   POST /profile/resend-verification
//  @access  Private
// ============================================================
const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Account is already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationToken = verificationToken;
    user.verificationExpires = verificationExpires;
    await user.save();

    // ✅ Send verification email
    try {
      await emailService.sendVerificationResendEmail(user, verificationToken);
    } catch (emailErr) {
      console.error('Verification email failed (non-blocking):', emailErr.message);
    }

    const response = {
      success: true,
      message: 'Verification email sent successfully! Please check your inbox.',
      development: process.env.NODE_ENV === 'development' ? { token: verificationToken } : undefined
    };

    if (req.xhr || req.headers.accept.indexOf('json') > -1) return res.json(response);

    req.flash('success', 'Verification email sent successfully!');
    res.redirect('/profile');
  } catch (error) {
    console.error('Resend verification error:', error);
    const errorResponse = {
      success: false,
      message: 'Failed to resend verification email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    };
    if (req.xhr || req.headers.accept.indexOf('json') > -1) return res.status(500).json(errorResponse);
    req.flash('error', errorResponse.message);
    res.redirect('/profile');
  }
};

// ============================================================
//  GET VERIFICATION STATUS
//  @route   GET /profile/verification-status
//  @access  Private
// ============================================================
const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id)
      .select('isVerified verifiedAt verificationExpires');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        isVerified: user.isVerified,
        verifiedAt: user.verifiedAt,
        canResend: !user.isVerified && (!user.verificationExpires || user.verificationExpires < new Date())
      }
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verification status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================================
//  INIT VERIFICATION
//  @route   POST /profile/init-verification
//  @access  Private
// ============================================================
const initVerification = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.json({ success: true, message: 'User is already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationToken = verificationToken;
    user.verificationExpires = verificationExpires;
    await user.save();

    // ✅ Send verification email
    try {
      await emailService.sendVerificationEmail(user, verificationToken);
    } catch (emailErr) {
      console.error('Verification email failed (non-blocking):', emailErr.message);
    }

    res.json({
      success: true,
      message: 'Verification process initialized. Check your email.',
      development: process.env.NODE_ENV === 'development' ? { token: verificationToken } : undefined
    });
  } catch (error) {
    console.error('Init verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize verification',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================================
//  FORGOT PASSWORD
//  @route   POST /forgot-password
//  @access  Public
// ============================================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // ✅ Send reset email
    try {
      await emailService.sendPasswordResetEmail(user, resetToken);
    } catch (emailErr) {
      console.error('Password reset email failed (non-blocking):', emailErr.message);
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      development: process.env.NODE_ENV === 'development' ? { resetToken } : undefined
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================================
//  RESET PASSWORD
//  @route   POST /reset-password
//  @access  Public
// ============================================================
const resetPassword = async (req, res) => {
  try {
    const { token, password, password_confirmation } = req.body;

    if (!token || !password || !password_confirmation) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password !== password_confirmation) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.updatedAt = new Date();
    await user.save();

    // ✅ Send password-changed confirmation (token = null triggers confirmation template)
    try {
      await emailService.sendPasswordResetEmail(user, null);
    } catch (emailErr) {
      console.error('Password changed confirmation failed (non-blocking):', emailErr.message);
    }

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================================
//  SEND PROMOTIONAL EMAIL (self → user)
//  @route   POST /profile/send-promotional-email
//  @access  Private
// ============================================================
const sendPromotionalEmail = async (req, res) => {
  try {
    const { subject, title, content, ctaUrl, ctaText, promoImage } = req.body;

    if (!subject || !content) {
      return res.status(400).json({ success: false, message: 'Subject and content are required' });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const promotion = {
      subject,
      title: title || subject,
      content,
      ctaUrl,
      ctaText,
      promoImage
    };

    // ✅ Send promotional email
    const result = await emailService.sendPromotionalEmail(user, promotion);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send promotional email',
        error: result.error
      });
    }

    res.json({ success: true, message: 'Promotional email sent successfully' });
  } catch (error) {
    console.error('Send promotional email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send promotional email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================================
//  UPLOAD PROFILE PICTURE
//  @route   POST /profile/picture
//  @access  Private
// ============================================================
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log('Uploaded file details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename
    });

    const user = await User.findById(req.session.user.id);
    if (!user) {
      await fs.unlink(req.file.path).catch(console.error);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const profilePicturePath = `/uploads/profiles/${req.file.filename}`;
    user.profilePicture = profilePicturePath;
    user.updatedAt = new Date();
    await user.save();

    req.session.user.profilePicture = profilePicturePath;

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        profile_image: profilePicturePath,
        profile_image_url: `${process.env.APP_URL || 'http://localhost:3000'}${profilePicturePath}`
      }
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    if (req.file) await fs.unlink(req.file.path).catch(console.error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================================
//  UPDATE PROFILE
//  @route   POST /profile/update
//  @access  Private
// ============================================================
const updateProfile = async (req, res) => {
  try {
    const {
      first_name, last_name, phone,
      address_1, address_2, city, state, country_id, timezone
    } = req.body;

    if (!first_name?.trim() || !last_name?.trim()) {
      if (req.xhr) {
        return res.status(400).json({ success: false, message: 'First name and last name are required' });
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
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      if (req.xhr) return res.status(404).json({ success: false, message: 'User not found' });
      req.flash('error', 'User not found');
      return res.redirect('/profile');
    }

    req.session.user.firstName = updatedUser.firstName;
    req.session.user.lastName = updatedUser.lastName;

    if (req.xhr) {
      return res.json({ success: true, message: 'Profile updated successfully' });
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

// ============================================================
//  CHANGE PASSWORD
//  @route   POST /profile/update_password
//  @access  Private
// ============================================================
const changePassword = async (req, res) => {
  try {
    const { old_password, password, password_confirmation } = req.body;

    if (!old_password || !password || !password_confirmation) {
      if (req.xhr) return res.status(400).json({ success: false, message: 'All password fields are required' });
      req.flash('error', 'All password fields are required');
      return res.redirect('/profile');
    }
    if (password !== password_confirmation) {
      if (req.xhr) return res.status(400).json({ success: false, message: 'New passwords do not match' });
      req.flash('error', 'New passwords do not match');
      return res.redirect('/profile');
    }
    if (password.length < 6) {
      if (req.xhr) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
      req.flash('error', 'New password must be at least 6 characters long');
      return res.redirect('/profile');
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      if (req.xhr) return res.status(404).json({ success: false, message: 'User not found' });
      req.flash('error', 'User not found');
      return res.redirect('/profile');
    }

    const isMatch = await user.comparePassword(old_password);
    if (!isMatch) {
      if (req.xhr) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/profile');
    }

    user.password = password;
    await user.save();

    // ✅ Send password-changed confirmation email (non-blocking)
    try {
      await emailService.sendPasswordResetEmail(user, null);
    } catch (emailErr) {
      console.error('Password change email failed (non-blocking):', emailErr.message);
    }

    if (req.xhr) {
      return res.json({ success: true, message: 'Password updated successfully' });
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

// ============================================================
//  UPDATE QR CODE
//  @route   POST /profile/update-qr-code
//  @access  Private
// ============================================================
const updateQRCode = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const qrData = `${process.env.APP_URL || 'http://localhost:3000'}/user/${user._id}`;
    const qrCodeDataURL = await QRCode.toDataURL(qrData);
    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');

    const filename = `qrcode-${user._id}-${Date.now()}.png`;
    const filePath = path.join(__dirname, '../public/uploads/qrcodes', filename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, base64Data, 'base64');

    user.qrCode = `/uploads/qrcodes/${filename}`;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'QR Code updated successfully',
      data: { qr_code_url: user.qrCode, qr_code_data_url: qrCodeDataURL }
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

// ============================================================
//  DELETE ACCOUNT
//  @route   DELETE /profile/delete-account
//  @access  Private
// ============================================================
const deleteAccount = async (req, res) => {
  try {
    const { confirmation } = req.body;

    if (confirmation !== 'DELETE') {
      return res.status(400).json({ success: false, message: 'Please type DELETE to confirm account deletion' });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.findByIdAndDelete(req.session.user.id);

    req.session.destroy((err) => {
      if (err) console.error('Session destroy error:', err);
      res.json({ success: true, message: 'Account deleted successfully' });
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

// ============================================================
//  GET USER SETTINGS
//  @route   GET /profile/settings
//  @access  Private
// ============================================================
const getUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id)
      .select('emailPreferences notifications timezone language');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        emailPreferences: user.emailPreferences || { promotional: true, security: true, updates: true },
        notifications: user.notifications || { email: true, push: false, sms: false },
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

// ============================================================
//  UPDATE USER SETTINGS
//  @route   POST /profile/settings
//  @access  Private
// ============================================================
const updateUserSettings = async (req, res) => {
  try {
    const { emailPreferences, notifications, timezone, language } = req.body;

    const updateData = { updatedAt: new Date() };
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
      return res.status(404).json({ success: false, message: 'User not found' });
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

// ============================================================
//  CHANGE DEFAULT CURRENCY
//  @route   POST /profile/change-default-currency
//  @access  Private
// ============================================================
const changeDefaultCurrency = async (req, res) => {
  try {
    const { currency } = req.body;

    if (!currency) {
      if (req.xhr) return res.status(400).json({ success: false, message: 'Currency is required' });
      req.flash('error', 'Currency is required');
      return res.redirect('/profile');
    }

    const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'BTC', 'ETH', 'XRP', 'STRAWMAN', 'LTC', 'ALGO', 'XDC', 'XLM', 'MATIC'];
    if (!validCurrencies.includes(currency)) {
      if (req.xhr) return res.status(400).json({ success: false, message: 'Invalid currency selected' });
      req.flash('error', 'Invalid currency selected');
      return res.redirect('/profile');
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      if (req.xhr) return res.status(404).json({ success: false, message: 'User not found' });
      req.flash('error', 'User not found');
      return res.redirect('/profile');
    }

    user.currency = currency;
    user.updatedAt = new Date();
    await user.save();

    req.session.user.currency = currency;

    if (req.xhr) {
      return res.json({
        success: true,
        message: 'Default currency updated successfully',
        data: { currency }
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

// ============================================================
//  EXPORTS
// ============================================================
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