import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { submitRating, getHostelRatings, getMyRating, getRatingAnalytics } from '../controllers/ratingController.js';

const router = Router();
router.use(authMiddleware);

router.post('/', submitRating);
router.get('/my', getMyRating);
router.get('/hostel/:hostelId', getHostelRatings);
router.get('/analytics/:hostelId', getRatingAnalytics);

export default router;
