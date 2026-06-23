import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getGuests,
  createGuest,
  updateGuest,
  checkoutGuest,
  deleteGuest,
} from '../controllers/guestController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getGuests);
router.post('/', createGuest);
router.put('/:guestId', updateGuest);
router.post('/:guestId/checkout', checkoutGuest);
router.delete('/:guestId', deleteGuest);

export default router;
