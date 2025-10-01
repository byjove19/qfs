// src/controllers/ticketController.ts
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middlewares/authMiddleware';
import Ticket, { ITicket } from '../models/Ticket';
import User from '../models/User';

export const createTicket = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { subject, description, category, priority } = req.body;

    const ticket = new Ticket({
      ticketId: `TKT${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      user: req.user!._id as import('mongoose').Types.ObjectId,
      subject,
      description,
      category,
      priority: priority || 'medium',
      status: 'open',
      messages: [{
        user: req.user!._id as import('mongoose').Types.ObjectId,
        message: description,
        attachments: req.files ? (req.files as Express.Multer.File[]).map(f => f.filename) : [],
        isInternal: false,
        createdAt: new Date()
      }]
    });

    await ticket.save();

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: { ticket }
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getTickets = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    
    const filter: any = { user: req.user!._id };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const tickets = await Ticket.find(filter)
      .select('-messages')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('assignedTo', 'firstName lastName email');

    const total = await Ticket.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findOne({
      _id: id,
      user: req.user!._id
    })
    .populate('assignedTo', 'firstName lastName email')
    .populate('messages.user', 'firstName lastName email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      data: { ticket }
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const addMessage = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { message, isInternal = false } = req.body;

    const ticket = await Ticket.findOne({
      _id: id,
      user: req.user!._id
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add message to closed ticket'
      });
    }

    // Update ticket status if it was resolved and user is adding a new message
    if (ticket.status === 'resolved') {
      ticket.status = 'in-progress';
    }

    ticket.messages.push({
      user: req.user!._id as import('mongoose').Types.ObjectId,
      message,
      attachments: req.files ? (req.files as Express.Multer.File[]).map(f => f.filename) : [],
      isInternal: req.user!.role !== 'user' ? isInternal : false,
      createdAt: new Date()
    });

    await ticket.save();

    const updatedTicket = await Ticket.findById(id)
      .populate('messages.user', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Message added successfully',
      data: { ticket: updatedTicket }
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const closeTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findOne({
      _id: id,
      user: req.user!._id
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Ticket is already closed'
      });
    }

    ticket.status = 'closed';
    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket closed successfully',
      data: { ticket }
    });
  } catch (error) {
    console.error('Close ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Admin functions
export const getAdminTickets = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, category, assignedTo } = req.query;
    
    const filter: any = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tickets = await Ticket.find(filter)
      .select('-messages')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('user', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    const total = await Ticket.countDocuments(filter);

    // Get support agents for assignment
    const supportAgents = await User.find({
      role: { $in: ['admin', 'superadmin'] }
    }).select('firstName lastName email');

    res.json({
      success: true,
      data: {
        tickets,
        supportAgents,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get admin tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const assignTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Verify assigned user is an admin/superadmin
    const assignee = await User.findOne({
      _id: assignedTo,
      role: { $in: ['admin', 'superadmin'] }
    });

    if (!assignee) {
      return res.status(400).json({
        success: false,
        message: 'Can only assign tickets to admin users'
      });
    }

    ticket.assignedTo = assignedTo;
    ticket.status = 'in-progress';

    // Add internal message about assignment
    ticket.messages.push({
      user: req.user!._id as import('mongoose').Types.ObjectId,
      message: `Ticket assigned to ${assignee.firstName} ${assignee.lastName}`,
      attachments: [],
      isInternal: true,
      createdAt: new Date()
    });

    await ticket.save();

    const updatedTicket = await Ticket.findById(id)
      .populate('user', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('messages.user', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Ticket assigned successfully',
      data: { ticket: updatedTicket }
    });
  } catch (error) {
    console.error('Assign ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};