import { Router } from 'express';
import { getOwners, updateOwner, deleteOwner } from '../controllers/userController.js';
import { authMiddleware, isAdmin } from '../middleware/auth.js';

const router = Router();

// Get all hostel owners - admin-only (dropdown selection on admin pages)
router.get('/owners', authMiddleware, isAdmin, getOwners);

// Update hostel owner details - admin may edit any owner; an owner may edit
// only their own record (checked inside the controller, since it needs to
// compare req.user against the :userId in the URL).
router.put('/owners/:userId', authMiddleware, updateOwner);

// Delete hostel owner - admin-only
router.delete('/owners/:userId', authMiddleware, isAdmin, deleteOwner);

export default router;
