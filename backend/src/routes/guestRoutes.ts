import express from 'express';
import { authMiddleware, isOwnerOrAdmin } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import {
  getGuests,
  createGuest,
  updateGuest,
  checkoutGuest,
  deleteGuest,
  checkUnique,
} from '../controllers/guestController.js';

const router = express.Router();

router.use(authMiddleware, requireActiveSubscription, isOwnerOrAdmin);

router.get('/check-unique', checkUnique);
router.get('/', getGuests);
router.post('/', createGuest);
router.put('/:guestId', updateGuest);
router.post('/:guestId/checkout', checkoutGuest);
router.delete('/:guestId', deleteGuest);

export default router;
