import express from 'express';
import { authMiddleware, isOwnerOrAdmin } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import { getRecentActivity } from '../controllers/activityController.js';

const router = express.Router();

// All routes require authentication and owner/admin access
router.use(authMiddleware, requireActiveSubscription, isOwnerOrAdmin);

// Activity routes
router.get('/recent', getRecentActivity);

export default router;
