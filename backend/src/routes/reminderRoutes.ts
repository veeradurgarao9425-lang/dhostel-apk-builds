import express from 'express';
import { authMiddleware, isOwnerOrAdmin } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder
} from '../controllers/reminderController.js';

const router = express.Router();

// Require authentication and owner/admin access for all reminder endpoints
router.use(authMiddleware, requireActiveSubscription, isOwnerOrAdmin);

router.get('/', getReminders);
router.post('/', createReminder);
router.put('/:reminderId', updateReminder);
router.delete('/:reminderId', deleteReminder);

export default router;
