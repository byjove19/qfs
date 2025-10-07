require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const path = require('path');
const flash = require('connect-flash');


const app = express();

// Database connection
mongoose.connect(process.env.MONGODB_URI ||  {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware - UPDATED CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net", 
        "https://fonts.googleapis.com"
      ],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://code.jquery.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'", 
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:",
        "https://cdnjs.cloudflare.com"
      ],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads/profiles', express.static(path.join(__dirname, 'uploads', 'profiles')));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

app.use(flash());

// Import middleware for protected routes
const { isAuthenticated, isGuest, isAdmin, attachUser, allowAdminLogin } = require('./middleware/auth');

// Global middleware - flash, CSRF token, user
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');

  next();
});

// Attach user globally (after flash and CSRF)
app.use(attachUser);

// ========== ROUTE IMPORTS ==========

// Import all route files
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const transactionRoutes = require('./routes/transactions');
const recipientRoutes = require('./routes/recipients');
const investmentRoutes = require('./routes/investment');
const walletController = require('./controllers/walletController');
const depositRoutes = require('./routes/deposit');
const adminWalletRoutes = require('./routes/adminWalletRoutes');
const userRoutes = require('./routes/userRoutes'); 

// ========== PUBLIC ROUTES (No authentication required) ==========

// Home and basic pages
app.get('/', (req, res) => {
  res.render('index', { title: 'Home - QFS' });
});

app.get('/index', (req, res) => {
  res.redirect('/');
});

// Regular auth pages (guests only - redirect logged in users)
app.get('/login', isGuest, (req, res) => {
  res.render('login', { title: 'Login - QFS' });
});

app.get('/signup', isGuest, (req, res) => {
  res.render('signup', { title: 'Sign Up - QFS' });
});

// Admin login page - ONLY defined here, NOT in auth routes
app.get('/admin-login', allowAdminLogin, (req, res) => {
  res.render('admin-login', { 
    title: 'Admin Login - QFS',
    error: req.flash('error'),
    success: req.flash('success'),
    info: req.flash('info')
  });
});

// Admin login POST - handle the form submission
app.post('/admin-login', async (req, res) => {
  const { validationResult } = require('express-validator');
  const User = require('./models/User');
  
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    // Check credentials first
    if (!user || !(await user.comparePassword(password))) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/admin-login');
    }

    // CRITICAL: Check if user has admin privileges
    if (!['admin', 'superadmin'].includes(user.role)) {
      req.flash('error', 'Access denied. Admin privileges required.');
      return res.redirect('/admin-login');
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

    req.flash('success', 'Admin login successful!');
    res.redirect('/admin/dashboard');

  } catch (error) {
    console.error('Admin login error:', error);
    req.flash('error', 'Login failed. Please try again.');
    res.redirect('/admin-login');
  }
});

// Logout route - accessible at /logout
app.get('/logout', (req, res) => {
  const wasAdmin = req.session.user && ['admin', 'superadmin'].includes(req.session.user.role);
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('connect.sid');
    
    if (wasAdmin) {
      res.redirect('/admin-login');
    } else {
      res.redirect('/login');
    }
  });
});

// ========== USE ROUTES IN CORRECT ORDER ==========

// Auth routes (handles /auth/login, /auth/register, etc. - NO admin-login here)
app.use('/auth', authRoutes);

// Admin routes (protected by isAdmin middleware INSIDE the adminRoutes file)
app.use('/admin', adminRoutes);

// FIXED: Mount user routes at /profile base path
app.use('/profile', userRoutes);  // This mounts all userRoutes at /profile

// Other protected routes
app.use('/', dashboardRoutes);
app.use('/transactions', transactionRoutes);
app.use('/', recipientRoutes);
app.use('/', investmentRoutes);
app.use('/', depositRoutes);
app.use('/admin', adminWalletRoutes);
// ========== INDIVIDUAL PROTECTED ROUTES ==========

// Wallet routes
app.get('/wallet', isAuthenticated, walletController.getWalletPage);

app.get('/deposit', isAuthenticated, (req, res) => {
  res.render('deposit', { title: 'Deposit Funds - QFS' });
});

// Investment routes
app.get('/investment', isAuthenticated, (req, res) => {
  res.render('investment', { title: 'Investments - QFS' });
});

app.get('/investment-list', isAuthenticated, (req, res) => {
  res.render('investment-list', { title: 'Investment Plans - QFS' });
});

// Support routes
app.get('/support', isAuthenticated, (req, res) => {
  res.render('support', { title: 'Support - QFS' });
});

app.get('/tickets', isAuthenticated, (req, res) => {
  res.render('tickets', { title: 'My Tickets - QFS' });
});

// Dispute routes
app.get('/disputes', isAuthenticated, (req, res) => {
  res.render('disputes', { title: 'Disputes - QFS' });
});

// Verification routes
app.get('/verification', isAuthenticated, (req, res) => {
  res.render('verification', { title: 'Identity Verification - QFS' });
});

// Virtual card routes
app.get('/virtual', isAuthenticated, (req, res) => {
  res.render('virtual', { title: 'Virtual Accounts - QFS' });
});

app.get('/virtualcard', isAuthenticated, (req, res) => {
  res.render('virtualcard', { title: 'Virtual Card - QFS' });
});

app.get('/makedepo', isAuthenticated, (req, res) => {
  res.render('makedepo', { 
    title: 'Make a Deposit - QFS',
    user: req.session.user 
  });
});
// ========== ERROR HANDLERS ==========

// 404 handler
app.use((req, res) => {
  res.status(404).render('error/404', { title: 'Page Not Found - QFS' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('=== SERVER ERROR ===');
  console.error(err.message);
  console.error(err.stack);
  console.error('=== END ERROR ===');
  
  // CSRF token errors
  if (err.code === 'EBADCSRFTOKEN') {
    req.flash('error', 'Invalid CSRF token');
    return res.redirect('back');
  }
  
  res.status(500).render('error/500', { title: 'Server Error - QFS' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`QFS Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Home page: http://localhost:${PORT}`);
  console.log(`Admin login: http://localhost:${PORT}/admin-login`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`User profile: http://localhost:${PORT}/profile`);
});