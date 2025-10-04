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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qfs', {
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
      // ✅ Allow styles from Bootstrap, Google Fonts, and CDNs
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net", 
        "https://fonts.googleapis.com"
      ],
      // ✅ Allow scripts from jQuery, Bootstrap, and CDNs
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://code.jquery.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      // ✅ Allow fonts from Google Fonts and CDNs
      fontSrc: [
        "'self'", 
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      // ✅ Allow images from various sources
      imgSrc: [
        "'self'", 
        "data:", 
        "https:",
        "https://cdnjs.cloudflare.com"
      ],
      // ✅ Allow connect sources (AJAX, APIs)
      connectSrc: ["'self'"],
      // ✅ Block Flash/objects
      objectSrc: ["'none'"],
      // ✅ Auto upgrade http → https
      upgradeInsecureRequests: []
    }
  }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/qfs',
    collectionName: 'sessions'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

app.use(flash());

// Global variables middleware
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  next();
});

// Import routes
app.use('/auth', require('./routes/auth'));
app.use('/', require('./routes/dashboard'));
app.use('/admin', require('./routes/admin'));

// Import middleware for protected routes
const { isAuthenticated, isAdmin } = require('./middleware/auth');

// ========== PUBLIC ROUTES (No authentication required) ==========

// Home and basic pages
app.get('/', (req, res) => {
  res.render('index', { title: 'Home - QFS' });
});

app.get('/index', (req, res) => {
  res.redirect('/');
});

// Auth pages
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login - QFS' });
});

app.get('/signup', (req, res) => {
  res.render('signup', { title: 'Sign Up - QFS' });
});

// ========== PROTECTED ROUTES (Authentication required) ==========

// Wallet routes
app.get('/wallet', isAuthenticated, (req, res) => {
  res.render('wallet', { title: 'My Wallet - QFS' });
});


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

app.get('/tickets', (req, res) => {
  res.render('tickets', { title: 'My Tickets - QFS' });
});

// Dispute routes
app.get('/disputes', isAuthenticated, (req, res) => {
  res.render('disputes', { title: 'Disputes - QFS' });
});

// Verification routes
app.get('/identity-verification', isAuthenticated, (req, res) => {
  res.render('identity-verification', { title: 'Identity Verification - QFS' });
});

// User profile routes
app.get('/profile', isAuthenticated, (req, res) => {
  res.render('profile', { title: 'My Profile - QFS' });
});

// Virtual card routes
app.get('/virtual', isAuthenticated, (req, res) => {
  res.render('virtual', { title: 'Virtual Accounts - QFS' });
});

app.get('/virtualcard', isAuthenticated, (req, res) => {
  res.render('virtualcard', { title: 'Virtual Card - QFS' });
});
app.get('/money-transfer', isAuthenticated, (req, res) => {
  res.render('money-transfer', { title: 'Money Transfer - QFS' });
});

app.get('/disputes', (req, res) => {
  res.render('disputes', { title: 'Disputes - QFS' });
});



// Import routes
app.use('/auth', require('./routes/auth'));
app.use('/', require('./routes/dashboard'));
app.use('/admin', require('./routes/admin'));
app.use('/transactions', require('./routes/transactions'));

// ========== ERROR HANDLERS ==========

// 404 handler
app.use((req, res) => {
  res.status(404).render('/error/404', { title: 'Page Not Found - QFS' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error/500', { title: 'Server Error - QFS' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`QFS Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Home page: http://localhost:${PORT}`);
  console.log(`Login page: http://localhost:${PORT}/login`);
});