import { Router } from 'express';
import { authMiddleware, isOwnerOrAdmin, isTenantOnly } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import { skipMeal, getMySkips, getMessAnalytics } from '../controllers/messSkipController.js';

const router = Router();
router.use(authMiddleware, requireActiveSubscription);
router.post('/skip', isTenantOnly, skipMeal);
router.get('/my-skips', isTenantOnly, getMySkips);
router.get('/analytics', isOwnerOrAdmin, getMessAnalytics);

export default router;
