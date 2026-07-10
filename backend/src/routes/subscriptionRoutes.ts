import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { renewSubscription, getSubscriptionStatus } from '../controllers/subscriptionController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/status', getSubscriptionStatus);
router.post('/renew', renewSubscription);

export default router;
