import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import {
  getRooms,
  getRoomById,
  getRoomBeds,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomTypes,
  bulkCreateRooms
} from '../controllers/roomController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware, requireActiveSubscription);

// Room routes
router.get('/', getRooms);
router.get('/types', getRoomTypes);
router.get('/:roomId/beds', getRoomBeds);
router.get('/:roomId', getRoomById);
router.post('/', createRoom);
router.post('/bulk', bulkCreateRooms);
router.put('/:roomId', updateRoom);
router.delete('/:roomId', deleteRoom);

export default router;
