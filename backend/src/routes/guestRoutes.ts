import express from 'express';
import multer from 'multer';
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

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }
});

const guestUpload = upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'id_proof_front', maxCount: 1 },
  { name: 'id_proof_back', maxCount: 1 }
]);

router.use(authMiddleware, requireActiveSubscription, isOwnerOrAdmin);

router.get('/check-unique', checkUnique);
router.get('/', getGuests);
router.post('/', guestUpload, createGuest);
router.put('/:guestId', guestUpload, updateGuest);
router.post('/:guestId/checkout', checkoutGuest);
router.delete('/:guestId', deleteGuest);

export default router;
