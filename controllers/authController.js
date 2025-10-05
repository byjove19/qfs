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
      
      if (!user || !(await user.comparePassword(password))) {
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
      
      if (!user || !(await user.comparePassword(password))) {
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
  }
};

module.exports = authController;