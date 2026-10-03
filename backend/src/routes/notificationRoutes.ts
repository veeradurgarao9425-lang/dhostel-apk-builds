import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import {
  registerToken,
  deregisterToken,
  getNotifications,
  markAsRead,
  markAllAsRead,
  sendTestNotification,
  getPushDiagnostics,
  sendTestMorningDigest
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(authMiddleware);

// Push token registration (always permitted for authenticated users)
router.post('/register-token', registerToken);
router.post('/deregister-token', deregisterToken);
router.post('/test', sendTestNotification);
router.get('/diagnostics', getPushDiagnostics);
router.post('/test-digest', sendTestMorningDigest);

// Notifications fetching and updates
router.get('/', requireActiveSubscription, getNotifications);
router.put('/:id/read', requireActiveSubscription, markAsRead);
router.put('/read-all', requireActiveSubscription, markAllAsRead);

export default router;

