require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const path = require('path');
const flash = require('connect-flash');

const app = express();

// ========== DATABASE CONNECTION ==========
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qfs', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// ========== VIEW ENGINE SETUP ==========
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ========== SECURITY MIDDLEWARE ==========
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

// ========== STATIC FILES ==========
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads/profiles', express.static(path.join(__dirname, 'uploads', 'profiles')));

// ========== BODY PARSING ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== SESSION CONFIGURATION ==========
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

// ========== FLASH MESSAGES ==========
app.use(flash());

// ========== AUTHENTICATION MIDDLEWARE ==========
const { isAuthenticated, isGuest, isAdmin, attachUser, allowAdminLogin } = require('./middleware/auth');

// Global middleware
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');
  next();
});

// Attach user to all views
app.use(attachUser);

// ========== APPLICATION HELPERS ==========
app.locals.getCurrencySymbol = function(currency) {
  const symbols = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$', 'JPY': '¥',
    'BTC': '₿', 'ETH': 'Ξ', 'XRP': '✕', 'DOGE': 'Ð', 'LTC': 'Ł', 'ALGO': 'Α',
    'XDC': 'XDC', 'XLM': 'XLM', 'MATIC': 'MATIC'
  };
  return symbols[currency] || currency;
};

app.locals.formatCurrencyAmount = function(amount, currency) {
  const symbol = app.locals.getCurrencySymbol(currency);
  const decimals = ['BTC', 'ETH', 'XRP', 'DOGE', 'LTC', 'ALGO', 'XDC', 'XLM', 'MATIC'].includes(currency) ? 8 : 2;
  return `${symbol}${parseFloat(amount).toFixed(decimals)}`;
};

// ========== ROUTE IMPORTS ==========
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
const ticketRoutes = require('./routes/tickets');
const Ticket = require('./models/Ticket');

// ========== PUBLIC ROUTES ==========

// Home page
app.get('/', (req, res) => {
  res.render('index', { title: 'Home - QFS' });
});

app.get('/index', (req, res) => {
  res.redirect('/');
});

// Authentication pages (guests only)
app.get('/login', isGuest, (req, res) => {
  res.render('login', { title: 'Login - QFS' });
});

app.get('/signup', isGuest, (req, res) => {
  res.render('signup', { title: 'Sign Up - QFS' });
});

// Admin login
app.get('/admin-login', allowAdminLogin, (req, res) => {
  res.render('admin-login', { 
    title: 'Admin Login - QFS',
    error: req.flash('error'),
    success: req.flash('success'),
    info: req.flash('info')
  });
});

app.post('/admin-login', async (req, res) => {
  const User = require('./models/User');
  
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/admin-login');
    }

    if (!['admin', 'superadmin'].includes(user.role)) {
      req.flash('error', 'Access denied. Admin privileges required.');
      return res.redirect('/admin-login');
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

    req.flash('success', 'Admin login successful!');
    res.redirect('/admin/dashboard');

  } catch (error) {
    console.error('Admin login error:', error);
    req.flash('error', 'Login failed. Please try again.');
    res.redirect('/admin-login');
  }
});

// Logout
app.get('/logout', (req, res) => {
  const wasAdmin = req.session.user && ['admin', 'superadmin'].includes(req.session.user.role);
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('connect.sid');
    res.redirect(wasAdmin ? '/admin-login' : '/login');
  });
});

// ========== DEBUG ROUTES (Development only) ==========
app.get('/debug-tickets', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const tickets = await Ticket.find({ userId: req.session.user._id })
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      ticketCount: tickets.length,
      tickets: tickets
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/create-test-ticket', async (req, res) => {
  try {
    if (!req.session.user) return res.redirect('/auth/login');

    const testTicket = new Ticket({
      userId: req.session.user._id,
      subject: 'TEST TICKET - ' + new Date().toLocaleString(),
      priority: 'medium',
      category: 'general',
      status: 'open',
      messages: [{
        senderId: req.session.user._id,
        message: 'This is a test ticket to verify the system is working.',
        timestamp: new Date()
      }]
    });

    await testTicket.save();
    console.log('✅ Test ticket created:', testTicket.ticketNumber);
    res.redirect('/tickets');
    
  } catch (error) {
    console.error('Test ticket error:', error);
    res.status(500).send('Error: ' + error.message);
  }
});

// ========== MOUNT ROUTE FILES ==========

// Authentication routes
app.use('/auth', authRoutes);

// Admin routes
app.use('/admin', adminRoutes);

// User routes
app.use('/profile', userRoutes);

// Application routes
app.use('/', dashboardRoutes);
app.use('/transactions', transactionRoutes);
app.use('/', recipientRoutes);
app.use('/', investmentRoutes);
app.use('/', depositRoutes);
app.use('/', ticketRoutes);

// Wallet routes
app.use('/admin', adminWalletRoutes);
app.use('/api/admin', adminWalletRoutes);
app.use('/api', adminWalletRoutes);

// ========== PROTECTED PAGE ROUTES ==========

// Wallet
app.get('/wallet', isAuthenticated, walletController.getWalletPage);

// Deposit
app.get('/deposit', isAuthenticated, (req, res) => {
  res.render('deposit', { title: 'Deposit Funds - QFS' });
});

// Investment
app.get('/investment', isAuthenticated, (req, res) => {
  res.render('investment', { title: 'Investments - QFS' });
});

app.get('/investment-list', isAuthenticated, (req, res) => {
  res.render('investment-list', { title: 'Investment Plans - QFS' });
});

// Support
app.get('/support', isAuthenticated, (req, res) => {
  res.render('support', { title: 'Support - QFS' });
});

// Disputes
app.get('/disputes', isAuthenticated, (req, res) => {
  res.render('disputes', { title: 'Disputes - QFS' });
});

// Verification
app.get('/verification', isAuthenticated, (req, res) => {
  res.render('verification', { title: 'Identity Verification - QFS' });
});

// Virtual cards
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

// 404 Handler
app.use((req, res) => {
  res.status(404).render('error/404', { title: 'Page Not Found - QFS' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('=== SERVER ERROR ===');
  console.error(err.message);
  console.error(err.stack);
  console.error('=== END ERROR ===');
  
  if (err.code === 'EBADCSRFTOKEN') {
    req.flash('error', 'Invalid CSRF token');
    return res.redirect('back');
  }
  
  res.status(500).render('error/500', { title: 'Server Error - QFS' });
});

// ========== SERVER STARTUP ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 QFS Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏠 Home page: http://localhost:${PORT}`);
  console.log(`🔐 Admin login: http://localhost:${PORT}/admin-login`);
  console.log(`⚙️  Admin panel: http://localhost:${PORT}/admin`);
  console.log(`👤 User profile: http://localhost:${PORT}/profile`);
});