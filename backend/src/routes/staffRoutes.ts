import express from 'express';
import { authMiddleware, isOwnerOrAdmin } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getStaffPayments,
  addStaffPayment,
  deleteStaffPayment,
  getStaffMonthlySummary,
  checkUnique
} from '../controllers/staffController.js';

const router = express.Router();

// All routes require authentication and owner/admin access
router.use(authMiddleware, requireActiveSubscription, isOwnerOrAdmin);

// Staff wage payments (declare specific routes before '/:staffId')
router.get('/:staffId/salary-summary', getStaffMonthlySummary);
router.get('/:staffId/payments', getStaffPayments);
router.post('/:staffId/payments', addStaffPayment);
router.delete('/payments/:paymentId', deleteStaffPayment);

// Staff routes
router.get('/check-unique', checkUnique);
router.get('/', getStaff);
router.get('/:staffId', getStaffById);
router.post('/', createStaff);
router.put('/:staffId', updateStaff);
router.delete('/:staffId', deleteStaff);

export default router;
