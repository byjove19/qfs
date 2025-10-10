// controllers/ticketController.js - FIXED VERSION
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const mongoose = require('mongoose');

const ticketController = {

  // Get all tickets for the logged-in user
  async getUserTickets(req, res) {
    try {
      console.log('🎫 getUserTickets - User ID:', req.session.user?._id);
      
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;
      const status = req.query.status || 'all';

      // Build filter - FIXED: Use proper user ID access
      const userId = req.session.user?._id || req.session.user?.id;
      if (!userId) {
        console.error('❌ No user ID in session');
        req.flash('error', 'Please login to view tickets');
        return res.redirect('/auth/login');
      }

      const filter = { userId: userId };
      if (status !== 'all') {
        const statusMap = { '1': 'open', '2': 'in-progress', '3': 'on-hold', '4': 'closed' };
        filter.status = statusMap[status];
      }

      console.log('🔍 Filter:', filter);

      // Get tickets
      const tickets = await Ticket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalTickets = await Ticket.countDocuments(filter);

      console.log(`✅ Found ${tickets.length} tickets for user ${userId}`);

      // Helper functions
      const helpers = {
        getPriorityBadgeClass: (priority) => {
          return { low: 'success', medium: 'info', high: 'warning', urgent: 'danger' }[priority] || 'secondary';
        },
        getStatusBadgeClass: (status) => {
          return { open: 'primary', 'in-progress': 'info', 'on-hold': 'warning', closed: 'secondary' }[status] || 'secondary';
        },
        getStatusDisplayName: (status) => {
          return { open: 'Open', 'in-progress': 'In Progress', 'on-hold': 'On Hold', closed: 'Closed' }[status] || status;
        }
      };

      // Render the page
      res.render('tickets', {
        title: 'Support Tickets',
        tickets: tickets,
        totalTickets: totalTickets,
        currentPage: page,
        totalPages: Math.ceil(totalTickets / limit),
        filter: { status: status },
        user: req.session.user,
        helpers: helpers,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });

    } catch (error) {
      console.error('❌ Get User Tickets Error:', error);
      req.flash('error', 'Failed to load your tickets');
      res.redirect('/dashboard');
    }
  },

  // AJAX endpoint for creating ticket
  async createTicketAjax(req, res) {
    try {
      console.log('📨 CREATE TICKET AJAX - User:', req.session.user?._id);
      console.log('Body:', req.body);

      const { subject, priority, category, message } = req.body;

      // Validate user session
      const userId = req.session.user?._id || req.session.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Please login to create a ticket'
        });
      }

      // Validate required fields
      if (!subject || !priority || !category || !message) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      // Create ticket
      const newTicket = new Ticket({
        userId: userId,
        subject: subject.trim(),
        priority: priority.toLowerCase(),
        category: category.toLowerCase(),
        status: 'open',
        messages: [{
          senderId: userId,
          message: message.trim(),
          timestamp: new Date()
        }],
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      await newTicket.save();
      console.log('✅ Ticket created:', newTicket.ticketNumber);

      // Notify admins
      await this.notifyAdminsAboutNewTicket(newTicket, req.session.user);

      res.json({
        success: true,
        message: 'Ticket created successfully!',
        ticketNumber: newTicket.ticketNumber
      });

    } catch (error) {
      console.error('❌ Create Ticket AJAX Error:', error);
      
      let errorMessage = 'Failed to create ticket. Please try again.';
      if (error.code === 11000) {
        errorMessage = 'Duplicate ticket detected. Please try again.';
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage
      });
    }
  },

  // Get single ticket details
  async getTicketDetails(req, res) {
    try {
      const userId = req.session.user?._id || req.session.user?.id;
      const ticket = await Ticket.findOne({
        _id: req.params.id,
        userId: userId
      }).populate('assignedTo', 'firstName lastName email');

      if (!ticket) {
        req.flash('error', 'Ticket not found');
        return res.redirect('/tickets');
      }

      res.render('tickets/detail', {
        title: `Ticket #${ticket.ticketNumber}`,
        ticket: ticket,
        user: req.session.user,
        messages: {
          success: req.flash('success'),
          error: req.flash('error')
        }
      });

    } catch (error) {
      console.error('Get Ticket Details Error:', error);
      req.flash('error', 'Failed to load ticket details');
      res.redirect('/tickets');
    }
  },

  // API: Get tickets for filtering
  async getUserTicketsAPI(req, res) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const userId = req.session.user?._id || req.session.user?.id;
      
      const filter = { userId: userId };
      if (status && status !== 'all') {
        const statusMap = { '1': 'open', '2': 'in-progress', '3': 'on-hold', '4': 'closed' };
        filter.status = statusMap[status];
      }

      const tickets = await Ticket.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const totalCount = await Ticket.countDocuments(filter);

      res.json({
        success: true,
        tickets,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: parseInt(page),
        totalCount
      });

    } catch (error) {
      console.error('Get User Tickets API Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching tickets'
      });
    }
  },

  // Notify admins about new ticket
  async notifyAdminsAboutNewTicket(ticket, user) {
    try {
      const admins = await User.find({
        role: { $in: ['admin', 'superadmin'] },
        isActive: true
      });

      console.log(`📢 New ticket created by ${user.firstName} ${user.lastName}:`, {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        priority: ticket.priority,
        category: ticket.category,
        adminsNotified: admins.length
      });

    } catch (error) {
      console.error('Notify Admins Error:', error);
    }
  }

};

module.exports = ticketController;