import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getGuests,
  createGuest,
  updateGuest,
  deleteGuest,
} from '../controllers/guestController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getGuests);
router.post('/', createGuest);
router.put('/:guestId', updateGuest);
router.delete('/:guestId', deleteGuest);

export default router;
