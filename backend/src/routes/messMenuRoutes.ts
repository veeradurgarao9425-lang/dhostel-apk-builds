import { Router } from 'express';
import { 
  createOrUpdateMenu, 
  getMenu 
} from '../controllers/messMenuController.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';

const router = Router();

router.use(authMiddleware, requireActiveSubscription);

router.post('/:hostelId', createOrUpdateMenu);
router.get('/:hostelId', getMenu);

export default router;
