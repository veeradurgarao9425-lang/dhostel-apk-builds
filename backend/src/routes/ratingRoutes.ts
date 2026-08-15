import { Router } from 'express';
import { authMiddleware, isOwnerOrAdmin, isTenantOnly } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import { submitRating, getHostelRatings, getMyRating, getRatingAnalytics } from '../controllers/ratingController.js';

const router = Router();
router.use(authMiddleware, requireActiveSubscription);

router.post('/', isTenantOnly, submitRating);
router.get('/my', isTenantOnly, getMyRating);
router.get('/hostel/:hostelId', isOwnerOrAdmin, getHostelRatings);
router.get('/analytics/:hostelId', isOwnerOrAdmin, getRatingAnalytics);

export default router;
