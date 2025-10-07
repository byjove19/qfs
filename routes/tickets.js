// routes/tickets.js
const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket'); // Your Ticket model

// Get all tickets for admin resolution
router.get('/admin/tickets', async (req, res) => {
    try {
        const { status, page = 1, limit = 10, priority, category } = req.query;
        
        // Build filter object
        const filter = {};
        if (status && status !== 'all') filter.status = status;
        if (priority) filter.priority = priority;
        if (category) filter.category = category;

        // Get tickets with pagination
        const tickets = await Ticket.find(filter)
            .populate('userId', 'firstName lastName email') // Populate user info
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        // Get total count for pagination
        const totalCount = await Ticket.countDocuments(filter);

        res.json({
            success: true,
            tickets,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            totalCount
        });

    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tickets'
        });
    }
});

// Get single ticket details for resolution
router.get('/admin/tickets/:ticketId', async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.ticketId)
            .populate('userId', 'firstName lastName email profilePicture');

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.json({
            success: true,
            ticket
        });

    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ticket'
        });
    }
});

