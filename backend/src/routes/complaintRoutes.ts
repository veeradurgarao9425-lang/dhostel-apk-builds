import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { createComplaint, getTenantComplaints, getHostelComplaints, updateComplaintStatus } from '../controllers/complaintController.js';
import { authMiddleware, isOwnerOrAdmin, isTenantOnly } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';

const router = Router();
router.use(authMiddleware, requireActiveSubscription);

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/'); },
  filename: (req, file, cb) => { cb(null, `complaint-${Date.now()}${path.extname(file.originalname)}`); }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Tenant routes
router.post('/tenant', upload.array('images', 3), isTenantOnly, createComplaint);
router.get('/tenant', isTenantOnly, getTenantComplaints);

// Owner routes
router.get('/hostel/:hostelId', isOwnerOrAdmin, getHostelComplaints);
router.put('/:complaintId/status', isOwnerOrAdmin, updateComplaintStatus);

export default router;
