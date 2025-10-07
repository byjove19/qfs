// controllers/investmentController.js
const Investment = require('../models/Investment');
const User = require('../models/User');

// Investment plans configuration (ONLY DECLARED ONCE)
const investmentPlans = [
  {
    id: 1,
    name: 'Bronze',
    minAmount: 100,
    maxAmount: 1000,
    profitPercent: 10,
    duration: 2,
    currency: 'USD'
  },
  {
    id: 2,
    name: 'Reg Saver',
    minAmount: 100,
    maxAmount: 1000,
    profitPercent: 6.5,
    duration: 10,
    currency: 'USD'
  },
  {
    id: 3,
    name: 'Razor',
    minAmount: 100,
    maxAmount: 2000,
    profitPercent: 10,
    duration: 12,
    currency: 'USD'
  },
  {
    id: 4,
    name: 'Facebook Like',
    minAmount: 23,
    maxAmount: 234235,
    profitPercent: 23,
    duration: 23,
    currency: 'USD'
  }
];

// GET investment page with form
exports.getInvestmentPage = async (req, res) => {
  try {
    console.log('DEBUG: Session user ID:', req.session.user?.id);
    
    const user = await User.findById(req.session.user.id); // Use .id
    
    if (!user) {
      console.log('ERROR: User not found in database');
      req.flash('error', 'User not found. Please log in again.');
      return res.redirect('/auth/login');
    }

    res.render('investment', {
      title: 'Invest Now - QFS',
      plans: investmentPlans,
      user: user
    });
  } catch (error) {
    console.error('Error loading investment page:', error);
    req.flash('error', 'Unable to load investment page');
    res.redirect('/dashboard');
  }
};

// GET investment list/history
exports.getInvestmentList = async (req, res) => {
  try {
    const investments = await Investment.find({ userId: req.session.user.id }) // Use .id
      .sort({ createdAt: -1 });
    
    res.render('investment-list', {
      title: 'My Investments - QFS',
      investments: investments
    });
  } catch (error) {
    console.error('Error loading investments:', error);
    req.flash('error', 'Unable to load investments');
    res.redirect('/dashboard');
  }
};

// POST create new investment
exports.createInvestment = async (req, res) => {
  try {
    const { plan, wallet, amount } = req.body;
    
    // Debug logging
    console.log('=== INVESTMENT FORM SUBMISSION ===');
    console.log('Request body:', req.body);
    console.log('Plan:', plan);
    console.log('Wallet:', wallet);
    console.log('Amount:', amount);
    console.log('Session user ID:', req.session.user.id); // Use .id
    console.log('================================');
    
    // Validate input
    if (!plan || !wallet || !amount) {
      console.log('Validation failed: Missing fields');
      req.flash('error', 'All fields are required');
      return res.redirect('/investment');
    }

    // Find the selected plan
    const selectedPlan = investmentPlans.find(p => p.name === plan);
    console.log('Selected plan:', selectedPlan);
    
    if (!selectedPlan) {
      console.log('ERROR: Plan not found. Available plans:', investmentPlans.map(p => p.name));
      req.flash('error', 'Invalid investment plan selected');
      return res.redirect('/investment');
    }

    const investAmount = parseFloat(amount);
    console.log('Investment amount:', investAmount);

    // Validate amount range
    if (investAmount < selectedPlan.minAmount || investAmount > selectedPlan.maxAmount) {
      console.log(`ERROR: Amount ${investAmount} outside range ${selectedPlan.minAmount}-${selectedPlan.maxAmount}`);
      req.flash('error', `Amount must be between ${selectedPlan.minAmount} and ${selectedPlan.maxAmount}`);
      return res.redirect('/investment');
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + selectedPlan.duration);
    console.log('Start date:', startDate);
    console.log('End date:', endDate);

    // Create investment with PENDING status
    const investment = new Investment({
      userId: req.session.user.id, // Use .id
      planName: selectedPlan.name,
      currency: wallet,
      amount: investAmount,
      status: 'pending', // Set to pending - admin must approve
      profitPercent: selectedPlan.profitPercent,
      duration: selectedPlan.duration,
      startDate: startDate,
      endDate: endDate,
      returns: 0
    });

    console.log('Investment object created:', investment);
    await investment.save();
    console.log('Investment saved to database');

    req.flash('success', 'Investment request submitted successfully. Awaiting admin approval.');
    res.redirect('/investment-list');
  } catch (error) {
    console.error('=== ERROR CREATING INVESTMENT ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('================================');
    req.flash('error', 'Unable to create investment. Please try again.');
    res.redirect('/investment');
  }
};

// GET single investment details
exports.getInvestmentDetails = async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.session.user.id // Use .id
    });

    if (!investment) {
      req.flash('error', 'Investment not found');
      return res.redirect('/investment-list');
    }

    res.render('investment-details', {
      title: 'Investment Details - QFS',
      investment: investment
    });
  } catch (error) {
    console.error('Error loading investment details:', error);
    req.flash('error', 'Unable to load investment details');
    res.redirect('/investment-list');
  }
};

// POST cancel investment
exports.cancelInvestment = async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.session.user.id // Use .id
    });

    if (!investment) {
      req.flash('error', 'Investment not found');
      return res.redirect('/investment-list');
    }

    if (investment.status !== 'active' && investment.status !== 'pending') {
      req.flash('error', 'Only active or pending investments can be cancelled');
      return res.redirect('/investment-list');
    }

    // If investment was active, refund the amount
    if (investment.status === 'active') {
      const user = await User.findById(req.session.user.id); // Use .id
      const walletKey = `${investment.currency.toLowerCase()}Balance`;
      user[walletKey] = (user[walletKey] || 0) + investment.amount;
      await user.save();
    }

    investment.status = 'cancelled';
    await investment.save();

    req.flash('success', investment.status === 'active' ? 'Investment cancelled and amount refunded' : 'Investment request cancelled');
    res.redirect('/investment-list');
  } catch (error) {
    console.error('Error cancelling investment:', error);
    req.flash('error', 'Unable to cancel investment');
    res.redirect('/investment-list');
  }
};

// ADMIN: Approve investment
exports.approveInvestment = async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id);

    if (!investment) {
      req.flash('error', 'Investment not found');
      return res.redirect('/admin/investments');
    }

    if (investment.status !== 'pending') {
      req.flash('error', 'Only pending investments can be approved');
      return res.redirect('/admin/investments');
    }

    // Check if user has sufficient balance
    const user = await User.findById(investment.userId);
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/investments');
    }

    const walletKey = `${investment.currency.toLowerCase()}Balance`;
    
    if (user[walletKey] === undefined) {
      req.flash('error', `User does not have a ${investment.currency} wallet`);
      return res.redirect('/admin/investments');
    }
    
    if (user[walletKey] < investment.amount) {
      req.flash('error', `User has insufficient balance. Has: ${user[walletKey]}, Needs: ${investment.amount}`);
      return res.redirect('/admin/investments');
    }

    // Deduct amount from user balance
    user[walletKey] -= investment.amount;
    await user.save();

    // Approve investment
    investment.status = 'active';
    investment.approvedBy = req.session.user.id; // Use .id
    investment.approvedAt = new Date();
    await investment.save();

    req.flash('success', 'Investment approved successfully and balance deducted');
    res.redirect('/admin/investments');
  } catch (error) {
    console.error('Error approving investment:', error);
    req.flash('error', 'Unable to approve investment');
    res.redirect('/admin/investments');
  }
};

// ADMIN: Reject investment
exports.rejectInvestment = async (req, res) => {
  try {
    const { reason } = req.body;
    const investment = await Investment.findById(req.params.id);

    if (!investment) {
      req.flash('error', 'Investment not found');
      return res.redirect('/admin/investments');
    }

    if (investment.status !== 'pending') {
      req.flash('error', 'Only pending investments can be rejected');
      return res.redirect('/admin/investments');
    }

    investment.status = 'rejected';
    investment.rejectionReason = reason || 'No reason provided';
    investment.approvedBy = req.session.user.id; // Use .id
    investment.approvedAt = new Date();
    await investment.save();

    req.flash('success', 'Investment rejected');
    res.redirect('/admin/investments');
  } catch (error) {
    console.error('Error rejecting investment:', error);
    req.flash('error', 'Unable to reject investment');
    res.redirect('/admin/investments');
  }
};

// ADMIN: Get all investments for admin panel
exports.adminGetAllInvestments = async (req, res) => {
  try {
    const investments = await Investment.find()
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.render('admin/investments', {
      title: 'Manage Investments - Admin',
      investments: investments
    });
  } catch (error) {
    console.error('Error loading investments:', error);
    req.flash('error', 'Unable to load investments');
    res.redirect('/admin/dashboard');
  }
};

module.exports = exports;