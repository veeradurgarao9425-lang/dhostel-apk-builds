import express from 'express';
import multer from 'multer';
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

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }
});

const staffUpload = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'profile_photo', maxCount: 1 },
  { name: 'aadhaar_front', maxCount: 1 },
  { name: 'id_proof_front', maxCount: 1 },
  { name: 'aadhaar_back', maxCount: 1 },
  { name: 'id_proof_back', maxCount: 1 },
]);

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
router.post('/', staffUpload, createStaff);
router.put('/:staffId', staffUpload, updateStaff);
router.delete('/:staffId', deleteStaff);

export default router;
