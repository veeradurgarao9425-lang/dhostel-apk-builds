import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { renewSubscription, getSubscriptionStatus, getSubscriptionHistory, getEmailLogs } from '../controllers/subscriptionController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/status', getSubscriptionStatus);
router.post('/renew', renewSubscription);
router.get('/history', getSubscriptionHistory);
router.get('/email-logs', getEmailLogs);

export default router;
