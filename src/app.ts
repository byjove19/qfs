import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import config from './config/env';
import flash from 'express-flash';

// Import routes
import authRoutes from './routes/auth';
import walletRoutes from './routes/wallet';
import transactionRoutes from './routes/transaction';
import adminRoutes from './routes/admin';
import investmentRoutes from './routes/investment';
import ticketRoutes from './routes/ticket';
import disputeRoutes from './routes/dispute';
// Import middleware
import { errorHandler, notFound } from './middlewares/errorHandler';

const app = express();

// Security middleware
// In your app.ts - update the Helmet CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com"
      ],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com"
      ],
      fontSrc: [
        "'self'", 
        "data:", 
        "https://cdnjs.cloudflare.com",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:",
        "http:"
      ],
      connectSrc: [
        "'self'", 
        "http://localhost:3000", // Allow API calls to your own server
        "ws://localhost:3000"    // Allow WebSocket connections if needed
      ],
    },
  },
}));


app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(helmet.referrerPolicy({ policy: "no-referrer" }));
app.use(cors());



// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database connection
mongoose.connect(config.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/disputes', disputeRoutes);

// Basic route for health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV 
  });
});

// SIMPLE VIEW ROUTES - Add these
app.get('/', (req, res) => {
  res.render('index', { title: 'Home' });
});

app.get('/index', (req, res) => {
  res.redirect('/');
});

// Add other basic view routes as needed
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard', { title: 'Dashboard' });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

export default app;