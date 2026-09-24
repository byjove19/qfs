// routes/api.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');

// Search recipients API
// routes/api.js - ENHANCED VERSION
router.post('/recipients/search', isAuthenticated, async (req, res) => {
    try {
        const { search } = req.body;
        const currentUserId = req.session.user._id;

        console.log('🔍 Search request:', { search, currentUserId });

        if (!search || search.length < 2) {
            return res.json({
                success: false,
                message: 'Search term must be at least 2 characters long'
            });
        }

        // Search users
        const recipients = await User.find({
            $and: [
                { _id: { $ne: currentUserId } },
                { 
                    $or: [
                        { email: { $regex: search, $options: 'i' } },
                        { firstName: { $regex: search, $options: 'i' } },
                        { lastName: { $regex: search, $options: 'i' } },
                        { phone: { $regex: search, $options: 'i' } }
                    ]
                }
            ]
        })
        .select('firstName lastName email phone')
        .limit(10)
        .lean();

        console.log('✅ Raw DB results:', recipients);

        // Process recipients to handle missing names
        const processedRecipients = recipients.map(recipient => {
            console.log('📝 Raw recipient from DB:', recipient);
            
            // Handle missing/null/undefined names with proper fallbacks
            let firstName = recipient.firstName || '';
            let lastName = recipient.lastName || '';
            const email = recipient.email || '';
            const phone = recipient.phone || '';
            
            // If names are empty but we have email, create display names
            if (!firstName && !lastName && email) {
                // Extract name from email (caroline@gmail.com -> Caroline)
                const emailName = email.split('@')[0];
                firstName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
                lastName = ''; // No last name from email
            }
            
            const processedRecipient = {
                email: email,
                firstName: firstName,
                lastName: lastName,
                phone: phone
            };
            
            console.log('✅ Processed recipient:', processedRecipient);
            return processedRecipient;
        });

        res.json({
            success: true,
            recipients: processedRecipients,
            count: processedRecipients.length
        });

    } catch (error) {
        console.error('❌ Search recipients error:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching recipients'
        });
    }
});


module.exports = router;