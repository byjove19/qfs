// routes/tickets.js - USING CONTROLLER
const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { isAuthenticated } = require('../middleware/auth');

// User ticket routes
router.get('/tickets', isAuthenticated, ticketController.getUserTickets);
router.post('/tickets/create-ajax', isAuthenticated, ticketController.createTicketAjax);
router.get('/tickets/:id', isAuthenticated, ticketController.getTicketDetails);

// API routes
router.get('/api/tickets', isAuthenticated, ticketController.getUserTicketsAPI);

module.exports = router;