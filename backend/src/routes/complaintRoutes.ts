import { Router } from 'express';
import { 
  createComplaint, 
  getTenantComplaints, 
  getHostelComplaints, 
  updateComplaintStatus 
} from '../controllers/complaintController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// Tenant routes
router.post('/tenant', createComplaint);
router.get('/tenant', getTenantComplaints);

// Owner routes
router.get('/hostel/:hostelId', getHostelComplaints);
router.put('/:complaintId/status', updateComplaintStatus);

export default router;
