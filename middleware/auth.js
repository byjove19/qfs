// middleware/auth.js - CLEAN VERSION
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  req.flash('error', 'Please log in to access this page');
  res.redirect('/auth/login');
};

const isGuest = (req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  
  // Redirect ALL logged-in users away from regular login/signup
  req.flash('info', 'You are already logged in');
  return res.redirect('/dashboard');
};

const isAdmin = (req, res, next) => {
  if (req.session.user && ['admin', 'superadmin'].includes(req.session.user.role)) {
    return next();
  }
  req.flash('error', 'Access denied. Admin privileges required.');
  res.redirect('/dashboard');
};

const isSuperAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'superadmin') {
    return next();
  }
  req.flash('error', 'Access denied. Super admin privileges required.');
  res.redirect('/dashboard');
};

const allowAdminLogin = (req, res, next) => {
  // If user is already logged in as admin, redirect to dashboard
  if (req.session.user && ['admin', 'superadmin'].includes(req.session.user.role)) {
    req.flash('info', 'You are already logged in as admin');
    return res.redirect('/admin/dashboard');
  }
  
  // If regular user is logged in, they can still see the admin login form
  next();
};

const attachUser = (req, res, next) => {
  if (req.session.user) {
    res.locals.user = req.session.user;
  }
  next();
};

module.exports = {
  isAuthenticated,
  isGuest,
  isAdmin,
  isSuperAdmin,
  attachUser,
  allowAdminLogin
};