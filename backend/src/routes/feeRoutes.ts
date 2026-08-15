import express from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware, isOwnerOrAdmin, isTenantOnly } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import {
  getFeePayments,
  getStudentPaymentHistory,
  recordPayment,
  getPaymentModes,
  getReceipt,
  getAvailableMonths,
  uploadPaymentProof,
  verifyPaymentProof,
  getTenantFeeHistory,
} from '../controllers/feeController.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `proof-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// All routes require authentication
router.use(authMiddleware, requireActiveSubscription);

// Tenant self-service routes (accessible by role_id=3)
router.get('/my-fees', isTenantOnly, getTenantFeeHistory);

// Fee/Payment routes
router.get('/payments', isOwnerOrAdmin, getFeePayments);
router.get('/available-months', getAvailableMonths);
router.get('/student/:studentId/payments', isOwnerOrAdmin, getStudentPaymentHistory);
router.post('/payments', isOwnerOrAdmin, recordPayment);
router.get('/payment-modes', getPaymentModes);
router.get('/receipts/:paymentId', getReceipt);

// Payment proof endpoints (tenant uploads, owner verifies)
router.post('/upload-proof', isTenantOnly, upload.single('proof'), uploadPaymentProof);
router.put('/payments/:paymentId/verify', isOwnerOrAdmin, verifyPaymentProof);

export default router;
