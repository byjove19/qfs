const User = require('../models/User');
const { validationResult } = require('express-validator');


// Helper function to sanitize user data
const sanitizeUser = (user) => {
  if (!user) return null;
  
  return {
    id: user._id?.toString(),
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    role: user.role || 'user',
    profilePicture: user.profilePicture || null,
    lastLogin: user.lastLogin || null
  };
};

// Helper function to sanitize error responses
const sanitizeErrors = (errors) => {
  if (Array.isArray(errors)) {
    return errors.map(error => ({
      field: error.path || error.param || 'general',
      message: error.msg || 'Validation error'
    }));
  }
  
  if (typeof errors === 'object') {
    return Object.entries(errors).map(([field, message]) => ({
      field,
      message: String(message)
    }));
  }
  
  return [{ field: 'general', message: 'An error occurred' }];
};

const authController = {
  getLogin: (req, res) => {
    res.render('login', { 
      title: 'Login - QFS',
      error: req.flash('error'),
      success: req.flash('success')
    });
  },

  getRegister: (req, res) => {
    res.render('signup', { 
      title: 'Register - QFS',
      error: req.flash('error'),
      success: req.flash('success')
    });
  },

  getAdminLogin: (req, res) => {
    res.render('admin-login', { 
      title: 'Admin Login - QFS',
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    });
  },

  // ADD PASSWORD VERIFICATION METHOD HERE
// UPDATE YOUR verifyPassword METHOD - FIXED VERSION
verifyPassword: async (req, res) => {
  try {
    console.log('=== PASSWORD VERIFICATION DEBUG ===');
    console.log('Session ID:', req.sessionID);
    console.log('Session user:', req.session.user);
    
    const { password } = req.body;
    const userId = req.session.user?._id || req.session.user?.id || req.session.userId;

    console.log('User ID from session:', userId);
    console.log('Password received:', password ? '***' : 'MISSING');

    if (!userId) {
      console.log('❌ No user ID in session - user not authenticated');
      return res.status(401).json({
        success: false,
        message: 'Please login first'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    console.log('Looking for user with ID:', userId);
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('User found:', user.email);
    console.log('Stored password hash present:', !!user.password);

    // FIX: Use the same method as your login functions
    console.log('Comparing passwords using user.comparePassword...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Password comparison failed');
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Store verification in session for subsequent requests
    req.session.passwordVerified = true;
    req.session.passwordVerifiedAt = new Date();
    
    console.log('✅ Password verified successfully');
    console.log('==============================');

    res.json({
      success: true,
      message: 'Password verified successfully'
    });

  } catch (error) {
    console.error('❌ Password verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Password verification failed'
    });
  }
},

  register: async (req, res) => {
    try {
      console.log('Registration request body:', {
        ...req.body,
        password: '[REDACTED]' // Never log passwords
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: sanitizeErrors(errors.array())
        });
      }

      const { firstName, lastName, email, password, phone } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
          errors: sanitizeErrors([{ path: 'email', msg: 'Email already registered' }])
        });
      }

      const user = new User({
        firstName: String(firstName || '').trim(),
        lastName: String(lastName || '').trim(),
        email: String(email || '').toLowerCase().trim(),
        password: password,
        phone: String(phone || '').trim()
      });

      await user.save();

      res.status(201).json({
        success: true,
        message: 'Registration successful! Please log in.',
        data: {
          userId: user._id?.toString(),
          email: user.email
        }
      });

    } catch (error) {
      console.error('Registration error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.',
        errors: sanitizeErrors([{ path: 'general', msg: 'Server error' }])
      });
    }
  },

  login: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: sanitizeErrors(errors.array())
        });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email: String(email).toLowerCase().trim() });
      
      // Check if user exists FIRST
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          errors: sanitizeErrors([{ path: 'general', msg: 'Invalid credentials' }])
        });
      }

      // Then check password
      if (!(await user.comparePassword(password))) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          errors: sanitizeErrors([{ path: 'general', msg: 'Invalid credentials' }])
        });
      }

      user.lastLogin = new Date();
      await user.save();

      const sanitizedUser = sanitizeUser(user);
      
      req.session.user = sanitizedUser;

      let redirectUrl = '/dashboard';
      if (user.role === 'admin' || user.role === 'superadmin') {
        redirectUrl = '/admin/dashboard';
      }

      res.json({
        success: true,
        message: 'Login successful!',
        redirect: redirectUrl,
        user: {
          id: sanitizedUser.id,
          firstName: sanitizedUser.firstName,
          lastName: sanitizedUser.lastName,
          email: sanitizedUser.email,
          role: sanitizedUser.role
        }
      });

    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.',
        errors: sanitizeErrors([{ path: 'general', msg: 'Server error' }])
      });
    }
  },

  adminLogin: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: sanitizeErrors(errors.array())
        });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email: String(email).toLowerCase().trim() });
      
      // Check if user exists FIRST
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          errors: sanitizeErrors([{ path: 'general', msg: 'Invalid credentials' }])
        });
      }

      // Then check password
      if (!(await user.comparePassword(password))) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          errors: sanitizeErrors([{ path: 'general', msg: 'Invalid credentials' }])
        });
      }

      if (!['admin', 'superadmin'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.',
          errors: sanitizeErrors([{ path: 'general', msg: 'Insufficient privileges' }])
        });
      }

      user.lastLogin = new Date();
      await user.save();

      const sanitizedUser = sanitizeUser(user);
      req.session.user = sanitizedUser;

      res.json({
        success: true,
        message: 'Admin login successful!',
        redirect: '/admin/dashboard',
        user: {
          id: sanitizedUser.id,
          firstName: sanitizedUser.firstName,
          lastName: sanitizedUser.lastName,
          email: sanitizedUser.email,
          role: sanitizedUser.role
        }
      });

    } catch (error) {
      console.error('Admin login error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.',
        errors: sanitizeErrors([{ path: 'general', msg: 'Server error' }])
      });
    }
  },

  logout: (req, res) => {
    const wasAdmin = req.session.user && ['admin', 'superadmin'].includes(req.session.user.role);
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err.message);
        req.flash('error', 'Error logging out');
        return res.redirect('/dashboard');
      }
      
      res.clearCookie('connect.sid');
      
      if (wasAdmin) {
        res.redirect('/admin-login');
      } else {
        res.redirect('/auth/login');
      }
    });
  },

  // Optional: Add a method to get current user info safely
  getCurrentUser: (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    res.json({
      success: true,
      user: sanitizeUser(req.session.user)
    });
  },

  async changePassword(req, res) {
    try {
      console.log('🔐 Change Password Request Started');
      console.log('Request body:', req.body);
      
      const { old_password, password, password_confirmation } = req.body;
      const userId = req.session.user?._id || req.session.user?.id;

      console.log('User ID from session:', userId);
      console.log('Session user:', req.session.user);

      // Validation
      if (!userId) {
        console.error('❌ No user ID in session');
        return res.status(401).json({
          success: false,
          message: 'Please login to change password'
        });
      }

      if (!old_password || !password || !password_confirmation) {
        console.error('❌ Missing required fields');
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      if (password !== password_confirmation) {
        console.error('❌ Password confirmation mismatch');
        return res.status(400).json({
          success: false,
          message: 'New password and confirmation do not match'
        });
      }

      if (password.length < 6) {
        console.error('❌ Password too short');
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Get user
      const user = await User.findById(userId);
      if (!user) {
        console.error('❌ User not found in database');
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      console.log('User found:', user.email);

      // Verify old password using comparePassword method
      console.log('🔑 Verifying old password...');
      const isOldPasswordValid = await user.comparePassword(old_password);
      console.log('Old password valid:', isOldPasswordValid);
      
      if (!isOldPasswordValid) {
        console.error('❌ Old password incorrect');
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Check if new password is same as old password
      if (old_password === password) {
        console.error('❌ New password same as old password');
        return res.status(400).json({
          success: false,
          message: 'New password cannot be the same as current password'
        });
      }

      console.log('🔄 Updating password...');
      // Update password (plain text - as per your model)
      user.password = password;
      await user.save();

      console.log('✅ Password changed successfully for user:', user.email);

      // SUCCESS RESPONSE
      res.json({
        success: true,
        message: 'Password changed successfully!'
      });

    } catch (error) {
      console.error('❌ Change Password Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password. Please try again.'
      });
    }
  },
  // Get user profile
  async getProfile(req, res) {
    try {
      const userId = req.session.user?._id || req.session.user?.id;
      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/dashboard');
      }

      res.render('profile', {
        title: 'Profile - QFS',
        user: user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });
    } catch (error) {
      console.error('Get Profile Error:', error);
      req.flash('error', 'Failed to load profile');
      res.redirect('/dashboard');
    }
  }

};

module.exports = authController;