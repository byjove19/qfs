const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { isAuthenticated } = require('../middleware/auth');

// Get recent recipients
router.get('/api/recipients/recent', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?._id;

    // Find transactions where user sent money to others
    const sentTransactions = await Transaction.find({
      userId: userId,
      type: 'send',
      recipientId: { $ne: userId }
    })
    .populate('recipientId', 'firstName lastName email avatar')
    .sort({ createdAt: -1 })
    .limit(10);

    // Extract unique recipients
    const recipientMap = new Map();
    
    sentTransactions.forEach(transaction => {
      if (transaction.recipientId && !recipientMap.has(transaction.recipientId._id.toString())) {
        recipientMap.set(transaction.recipientId._id.toString(), {
          id: transaction.recipientId._id,
          name: `${transaction.recipientId.firstName} ${transaction.recipientId.lastName}`,
          email: transaction.recipientId.email,
          avatar: transaction.recipientId.avatar || '/images/default-avatar.png'
        });
      }
    });

    const recipients = Array.from(recipientMap.values());

    // If no recent recipients, return some sample users (remove this in production)
    if (recipients.length === 0) {
      const sampleUsers = await User.find({
        _id: { $ne: userId }
      })
      .select('firstName lastName email avatar')
      .limit(3);
      
      sampleUsers.forEach(user => {
        recipients.push({
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          avatar: user.avatar || '/images/default-avatar.png'
        });
      });
    }

    res.json({
      success: true,
      recipients: recipients
    });

  } catch (error) {
    console.error('Error fetching recent recipients:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Search recipients
router.post('/api/recipients/search', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?._id;
    const { search } = req.body;

    if (!search || search.length < 3) {
      return res.json({ success: true, recipients: [] });
    }

    const recipients = await User.find({
      $and: [
        { _id: { $ne: userId } }, // Exclude self
        {
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { 
              $expr: {
                $regexMatch: {
                  input: { $concat: ["$firstName", " ", "$lastName"] },
                  regex: search,
                  options: "i"
                }
              }
            }
          ]
        }
      ]
    }).select('firstName lastName email avatar').limit(10);

    const formattedRecipients = recipients.map(user => ({
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      avatar: user.avatar || '/images/default-avatar.png'
    }));

    res.json({
      success: true,
      recipients: formattedRecipients
    });

  } catch (error) {
    console.error('Error searching recipients:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;