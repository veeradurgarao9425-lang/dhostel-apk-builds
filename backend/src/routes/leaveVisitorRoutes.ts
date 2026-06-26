import { Router } from 'express';
import { 
  createLeaveRequest, 
  getTenantLeaves, 
  getHostelLeaves, 
  updateLeaveStatus,
  createVisitorRequest,
  getTenantVisitors,
  getHostelVisitors,
  updateVisitorStatus
} from '../controllers/leaveVisitorController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// Tenant Leave Routes
router.post('/leave/tenant', createLeaveRequest);
router.get('/leave/tenant', getTenantLeaves);

// Owner Leave Routes
router.get('/leave/hostel/:hostelId', getHostelLeaves);
router.put('/leave/:leaveId/status', updateLeaveStatus);

// Tenant Visitor Routes
router.post('/visitor/tenant', createVisitorRequest);
router.get('/visitor/tenant', getTenantVisitors);

// Owner Visitor Routes
router.get('/visitor/hostel/:hostelId', getHostelVisitors);
router.put('/visitor/:visitorId/status', updateVisitorStatus);

export default router;
