import { Router } from 'express';
import { 
  createOrUpdateMenu, 
  getMenu 
} from '../controllers/messMenuController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.post('/:hostelId', createOrUpdateMenu);
router.get('/:hostelId', getMenu);

export default router;
