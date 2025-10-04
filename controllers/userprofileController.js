// User profile controller
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.render('profile', { user });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, address, timezone } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        firstName, 
        lastName, 
        phone,
        'address.street': req.body.address_1,
        'address.city': req.body.city,
        'address.state': req.body.state,
        'address.country': req.body.country_id,
        timezone 
      },
      { new: true }
    ).select('-password');

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    // Validate input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both old and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long' 
      });
    }

    const user = await User.findById(req.user.id);

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Update password (this will trigger the pre-save hook to hash it)
    user.password = newPassword;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Password change failed',
      error: error.message 
    });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: `/uploads/${req.file.filename}` },
      { new: true }
    );

    res.json({ success: true, profilePicture: user.profilePicture });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
};
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, city, state, country_id, timezone } = req.body;
    
    const updateData = {
      firstName, 
      lastName, 
      phone,
      timezone,
      address: {
        street: req.body.address_1,
        city: req.body.city,
        state: req.body.state,
        country: req.body.country_id
      }
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Update failed',
      error: error.message 
    });
  }
};