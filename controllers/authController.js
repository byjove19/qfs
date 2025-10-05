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

    // FIX: Redirect admins to admin panel
    let redirectUrl = '/dashboard';
    if (user.role === 'admin' || user.role === 'superadmin') {
      redirectUrl = '/admin';
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

  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/auth/login');
    });
  }
};

module.exports = authController;