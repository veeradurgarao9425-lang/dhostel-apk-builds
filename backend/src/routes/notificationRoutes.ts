import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  registerToken,
  deregisterToken,
  getNotifications,
  markAsRead,
  markAllAsRead
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(authMiddleware);

// Push token registration
router.post('/register-token', registerToken);
router.post('/deregister-token', deregisterToken);

// Notifications fetching and updates
router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);

export default router;
