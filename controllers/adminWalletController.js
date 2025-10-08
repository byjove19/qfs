const AdminWallet = require('../models/adminWallet');

// Get all wallet addresses for admin page (HTML)
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
    console.log('API: Fetching wallet addresses...');
    const wallets = await AdminWallet.find().sort({ currency: 1 });
    
    // Format for admin panel
    const walletData = {};
    wallets.forEach(wallet => {
      walletData[wallet.currency] = {
        currency: wallet.currency,
        name: wallet.currency, // Add name field
        address: wallet.address,
        network: wallet.network,
        isActive: wallet.isActive
      };
    });

    console.log(`API: Returning ${wallets.length} wallets`);
    res.json({
      success: true,
      data: walletData,
      count: wallets.length
    });
  } catch (error) {
    console.error('Error fetching wallet addresses API:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet addresses',
      error: error.message
    });
  }
};

// API: Update wallet address
exports.updateWalletAddressAPI = async (req, res) => {
  try {
    const { currency } = req.params;
    const { address, network } = req.body;

    console.log(`API: Updating ${currency} wallet...`);

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

    console.log(`API: ${currency} wallet updated successfully`);
    res.json({
      success: true,
      message: `${currency} address updated successfully`,
      data: wallet
    });
  } catch (error) {
    console.error('Error updating wallet address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update wallet address',
      error: error.message
    });
  }
};

// API: Get wallet addresses for frontend (public)
exports.getWalletAddressesPublic = async (req, res) => {
  try {
    console.log('Public API: Fetching active wallet addresses...');
    const wallets = await AdminWallet.find({ isActive: true })
      .select('currency address network')
      .lean();

    const walletData = {};
    wallets.forEach(wallet => {
      walletData[wallet.currency] = wallet.address;
    });

    console.log(`Public API: Returning ${wallets.length} active wallets`);
    res.json({
      success: true,
      data: walletData,
      wallets: wallets,
      count: wallets.length
    });
  } catch (error) {
    console.error('Error fetching public wallet addresses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet addresses',
      error: error.message
    });
  }
};

// API: Toggle wallet active status
exports.toggleWalletStatusAPI = async (req, res) => {
  try {
    const { currency } = req.params;
    const { isActive } = req.body;

    console.log(`API: Toggling ${currency} status to ${isActive}`);

    const wallet = await AdminWallet.findOneAndUpdate(
      { currency: currency },
      { isActive: isActive },
      { new: true }
    );

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    console.log(`API: ${currency} status updated`);
    res.json({
      success: true,
      message: `${currency} wallet ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: wallet
    });
  } catch (error) {
    console.error('Error toggling wallet status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update wallet status',
      error: error.message
    });
  }
};