const User = require('../models/User');
const { validationResult } = require('express-validator');

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

  // Admin Login Page - Separate from regular login
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
      console.log('Registration request body:', req.body);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().reduce((acc, error) => {
            acc[error.path] = error.msg;
            return acc;
          }, {})
        });
      }

      const { firstName, lastName, email, password, phone } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
          errors: { email: 'Email already registered' }
        });
      }

      const user = new User({
        firstName,
        lastName,
        email,
        password,
        phone: phone || ''
      });

      await user.save();

      res.status(201).json({
        success: true,
        message: 'Registration successful! Please log in.',
        data: {
          userId: user._id,
          email: user.email
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.',
        errors: { general: 'Server error' }
      });
    }
  },

  // Regular user login
  login: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email });
      
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      user.lastLogin = new Date();
      await user.save();

      req.session.user = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture
      };

      // Regular users go to dashboard, admins redirected to admin panel
      let redirectUrl = '/dashboard';
      if (user.role === 'admin' || user.role === 'superadmin') {
        redirectUrl = '/admin/dashboard';
      }

      res.json({
        success: true,
        message: 'Login successful!',
        redirect: redirectUrl
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.'
      });
    }
  },

  // Admin-only login (validates admin role before allowing access)
  adminLogin: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email });
      
      // Check credentials first
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // CRITICAL: Check if user has admin privileges
      if (!['admin', 'superadmin'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Create session
      req.session.user = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture
      };

      res.json({
        success: true,
        message: 'Admin login successful!',
        redirect: '/admin/dashboard'
      });

    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.'
      });
    }
  },

  // Logout with proper cleanup and smart redirects
  logout: (req, res) => {
    // Check if user was admin before destroying session
    const wasAdmin = req.session.user && ['admin', 'superadmin'].includes(req.session.user.role);
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        req.flash('error', 'Error logging out');
        return res.redirect('/dashboard');
      }
      
      // Clear the session cookie
      res.clearCookie('connect.sid');
      
      // Redirect based on user type
      if (wasAdmin) {
        res.redirect('/admin-login');
      } else {
        res.redirect('/auth/login');
      }
    });
  }
};

module.exports = authController;