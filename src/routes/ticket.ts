// src/routes/ticket.ts
import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { 
  createTicket,
  getTickets,
  getTicket,
  addMessage,
  closeTicket,
  getAdminTickets,
  assignTicket
} from '../controllers/ticketController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();
const upload = multer({ dest: 'public/uploads/tickets/' });

// User routes
router.use(authenticate);

router.post('/',
  upload.array('attachments', 5),
  [
    body('subject').notEmpty().trim(),
    body('description').notEmpty().trim(),
    body('category').notEmpty().trim(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
  ],
  createTicket
);
router.get('/', getTickets);
router.get('/:id', getTicket);
router.post('/:id/messages',
  upload.array('attachments', 5),
  [
    body('message').notEmpty().trim()
  ],
  addMessage
);
router.post('/:id/close', closeTicket);

// Admin routes
router.get('/admin/tickets', getAdminTickets);
router.post('/admin/tickets/:id/assign', 
  [
    body('assignedTo').isMongoId()
  ],
  assignTicket
);

export default router;