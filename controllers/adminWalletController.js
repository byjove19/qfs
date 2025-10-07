
const AdminWallet = require('../models/adminWallet');

// Get all wallet addresses for admin page
exports.getWalletAddresses = async (req, res) => {
  try {
    const wallets = await AdminWallet.find().sort({ currency: 1 });
    
    res.render('admin/wallet-addresses', {
      title: 'Manage Wallet Addresses - Admin',
      wallets: wallets,
      user: req.session.user,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (error) {
    console.error('Error fetching wallet addresses:', error);
    res.status(500).render('error/500', {
      title: 'Server Error',
      error: req.app.get('env') === 'development' ? error : {},
      user: req.session.user
    });
  }
};

// API: Get all wallet addresses for admin panel (JSON)
exports.getWalletAddressesAPI = async (req, res) => {
  try {
    const wallets = await AdminWallet.find().sort({ currency: 1 });
    
    // Format for admin panel
    const walletData = {};
    wallets.forEach(wallet => {
      walletData[wallet.currency] = {
        currency: wallet.currency,
        address: wallet.address,
        network: wallet.network,
        isActive: wallet.isActive
      };
    });

    res.json({
      success: true,
      data: walletData,
      count: wallets.length
    });
  } catch (error) {
    console.error('Error fetching wallet addresses API:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet addresses'
    });
  }
};

// API: Update wallet address
exports.updateWalletAddressAPI = async (req, res) => {
  try {
    const { currency } = req.params;
    const { address, network } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    const updateData = {
      address: address.trim(),
      network: network || 'Mainnet',
      isActive: true,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address.trim())}`
    };

    const wallet = await AdminWallet.findOneAndUpdate(
      { currency: currency },
      updateData,
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: `${currency} address updated successfully`,
      data: wallet
    });
  } catch (error) {
    console.error('Error updating wallet address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update wallet address'
    });
  }
};

// API: Get wallet addresses for frontend (public)
exports.getWalletAddressesPublic = async (req, res) => {
  try {
    const wallets = await AdminWallet.find({ isActive: true })
      .select('currency address network')
      .lean();

    const walletData = {};
    wallets.forEach(wallet => {
      walletData[wallet.currency] = wallet.address;
    });

    res.json({
      success: true,
      data: walletData,
      wallets: wallets
    });
  } catch (error) {
    console.error('Error fetching public wallet addresses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet addresses'
    });
  }
};