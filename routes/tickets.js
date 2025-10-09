// Add this to your routes file (e.g., routes/tickets.js or routes/api.js)

const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket'); // Adjust path to your Ticket model
const { isAuthenticated } = require('../middleware/auth'); // Adjust path

// POST /api/tickets/create - Create new ticket
router.post('/api/tickets/create', isAuthenticated, async (req, res) => {
    try {
        console.log('=== CREATE TICKET REQUEST ===');
        console.log('User:', req.session.user?.email);
        console.log('Body:', req.body);

        const { subject, priority, category, message } = req.body;
        const userId = req.session.user?._id || req.session.user?.id || req.session.userId;

        // Validate required fields
        if (!subject || !priority || !category || !message) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate user is authenticated
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Please login to create a ticket'
            });
        }

        // Generate unique ticket number
        const ticketNumber = 'TKT' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

        // Create new ticket
        const newTicket = new Ticket({
            userId: userId,
            ticketNumber: ticketNumber,
            subject: subject.trim(),
            priority: priority,
            category: category,
            message: message.trim(),
            status: 'open',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Save ticket to database
        await newTicket.save();

        console.log('✅ Ticket created successfully:', ticketNumber);

        // Return success response
        res.json({
            success: true,
            message: 'Ticket created successfully',
            ticketNumber: ticketNumber,
            ticket: {
                _id: newTicket._id,
                ticketNumber: newTicket.ticketNumber,
                subject: newTicket.subject,
                priority: newTicket.priority,
                category: newTicket.category,
                status: newTicket.status,
                createdAt: newTicket.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Error creating ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create ticket. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/tickets - Get user's tickets
router.get('/api/tickets', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user?._id || req.session.user?.id || req.session.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const tickets = await Ticket.find({ userId })
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            tickets: tickets
        });

    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tickets'
        });
    }
});

// GET /api/tickets/:id - Get single ticket
router.get('/api/tickets/:id', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user?._id || req.session.user?.id || req.session.userId;
        const ticketId = req.params.id;

        const ticket = await Ticket.findOne({ 
            _id: ticketId, 
            userId: userId 
        }).lean();

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.json({
            success: true,
            ticket: ticket
        });

    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ticket'
        });
    }
});

// POST /api/tickets/:id/reply - Add reply to ticket
router.post('/api/tickets/:id/reply', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user?._id || req.session.user?.id || req.session.userId;
        const ticketId = req.params.id;
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Reply message is required'
            });
        }

        const ticket = await Ticket.findOne({ 
            _id: ticketId, 
            userId: userId 
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Add reply to ticket
        if (!ticket.replies) {
            ticket.replies = [];
        }

        ticket.replies.push({
            userId: userId,
            message: message.trim(),
            isAdmin: false,
            createdAt: new Date()
        });

        ticket.updatedAt = new Date();
        ticket.status = 'waiting_admin'; // Update status to indicate user replied

        await ticket.save();

        res.json({
            success: true,
            message: 'Reply added successfully',
            ticket: ticket
        });

    } catch (error) {
        console.error('Error adding reply:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add reply'
        });
    }
});

// PUT /api/tickets/:id/close - Close ticket
router.put('/api/tickets/:id/close', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user?._id || req.session.user?.id || req.session.userId;
        const ticketId = req.params.id;

        const ticket = await Ticket.findOne({ 
            _id: ticketId, 
            userId: userId 
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        ticket.status = 'closed';
        ticket.closedAt = new Date();
        ticket.updatedAt = new Date();

        await ticket.save();

        res.json({
            success: true,
            message: 'Ticket closed successfully',
            ticket: ticket
        });

    } catch (error) {
        console.error('Error closing ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to close ticket'
        });
    }
});

module.exports = router;

