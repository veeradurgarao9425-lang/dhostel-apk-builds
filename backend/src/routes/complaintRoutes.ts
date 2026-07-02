import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { createComplaint, getTenantComplaints, getHostelComplaints, updateComplaintStatus } from '../controllers/complaintController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/'); },
  filename: (req, file, cb) => { cb(null, `complaint-${Date.now()}${path.extname(file.originalname)}`); }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Tenant routes
router.post('/tenant', upload.array('images', 3), createComplaint);
router.get('/tenant', getTenantComplaints);

// Owner routes
router.get('/hostel/:hostelId', getHostelComplaints);
router.put('/:complaintId/status', updateComplaintStatus);

export default router;
