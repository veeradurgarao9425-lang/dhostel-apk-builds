import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder
} from '../controllers/reminderController.js';

const router = express.Router();

// Require authentication for all reminder endpoints
router.use(authMiddleware);

router.get('/', getReminders);
router.post('/', createReminder);
router.put('/:reminderId', updateReminder);
router.delete('/:reminderId', deleteReminder);

export default router;
