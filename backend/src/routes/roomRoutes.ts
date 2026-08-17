import express from 'express';
import { authMiddleware, isOwnerOrAdmin } from '../middleware/auth.js';
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

// All routes require authentication and active subscription
router.use(authMiddleware, requireActiveSubscription);

// Read-only routes (accessible by owners, admins, and tenants of the hostel)
router.get('/types', getRoomTypes);
router.get('/:roomId/beds', getRoomBeds);
router.get('/:roomId', getRoomById);

// Owner/Admin restricted management routes
router.get('/', isOwnerOrAdmin, getRooms);
router.post('/', isOwnerOrAdmin, createRoom);
router.post('/bulk', isOwnerOrAdmin, bulkCreateRooms);
router.put('/:roomId', isOwnerOrAdmin, updateRoom);
router.delete('/:roomId', isOwnerOrAdmin, deleteRoom);

export default router;
