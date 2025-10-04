const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  req.flash('error', 'Please log in to access this page');
  res.redirect('/auth/login');
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

const attachUser = (req, res, next) => {
  if (req.session.user) {
    res.locals.user = req.session.user;
  }
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isSuperAdmin,
  attachUser
};