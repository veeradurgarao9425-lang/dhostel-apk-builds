import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { skipMeal, getMySkips, getMessAnalytics } from '../controllers/messSkipController.js';

const router = Router();
router.use(authMiddleware);
router.post('/skip', skipMeal);
router.get('/my-skips', getMySkips);
router.get('/analytics', getMessAnalytics);

export default router;
