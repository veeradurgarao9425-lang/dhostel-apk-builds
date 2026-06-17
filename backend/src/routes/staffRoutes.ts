import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff
} from '../controllers/staffController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Staff routes
router.get('/', getStaff);
router.get('/:staffId', getStaffById);
router.post('/', createStaff);
router.put('/:staffId', updateStaff);
router.delete('/:staffId', deleteStaff);

export default router;
