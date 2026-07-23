import { Router } from 'express';
import {
  getAmenities,
  getRoomAmenities,
  createAmenity,
  createRoomAmenity,
  updateAmenity,
  deleteAmenity
} from '../controllers/amenitiesController.js';
import { authMiddleware, isOwnerOrAdmin } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';

const router = Router();

// Get all active amenities (accessible by both admin and owners)
router.get('/', authMiddleware, requireActiveSubscription, getAmenities);

// Get all active room amenities (accessible by both admin and owners)
router.get('/rooms', authMiddleware, requireActiveSubscription, getRoomAmenities);

// Create a new room amenity (accessible by owners when adding custom amenities)
router.post('/rooms', authMiddleware, requireActiveSubscription, isOwnerOrAdmin, createRoomAmenity);

// Admin-only routes for managing amenities
router.post('/', authMiddleware, requireActiveSubscription, isOwnerOrAdmin, createAmenity);
router.put('/:amenityId', authMiddleware, requireActiveSubscription, isOwnerOrAdmin, updateAmenity);
router.delete('/:amenityId', authMiddleware, requireActiveSubscription, isOwnerOrAdmin, deleteAmenity);

export default router;
