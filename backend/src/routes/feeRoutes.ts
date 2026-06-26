import express from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware } from '../middleware/auth.js';
import {
  getFeePayments,
  getStudentPaymentHistory,
  recordPayment,
  getPaymentModes,
  getReceipt,
  getAvailableMonths,
  uploadPaymentProof,
  verifyPaymentProof
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
router.use(authMiddleware);

// Fee/Payment routes
router.get('/payments', getFeePayments);
router.get('/available-months', getAvailableMonths);
router.get('/student/:studentId/payments', getStudentPaymentHistory);
router.post('/payments', recordPayment);
router.get('/payment-modes', getPaymentModes);
router.get('/receipts/:paymentId', getReceipt);

// Payment proof endpoints
router.post('/upload-proof', upload.single('proof'), uploadPaymentProof);
router.put('/payments/:paymentId/verify', verifyPaymentProof);

export default router;
