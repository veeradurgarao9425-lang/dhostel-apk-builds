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
import { authMiddleware, isOwnerOrAdmin, isTenantOnly } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';

const router = Router();

router.use(authMiddleware, requireActiveSubscription);

// Tenant Leave Routes
router.post('/leave/tenant', isTenantOnly, createLeaveRequest);
router.get('/leave/tenant', isTenantOnly, getTenantLeaves);

// Owner Leave Routes
router.get('/leave/hostel/:hostelId', isOwnerOrAdmin, getHostelLeaves);
router.put('/leave/:leaveId/status', isOwnerOrAdmin, updateLeaveStatus);

// Tenant Visitor Routes
router.post('/visitor/tenant', isTenantOnly, createVisitorRequest);
router.get('/visitor/tenant', isTenantOnly, getTenantVisitors);

// Owner Visitor Routes
router.get('/visitor/hostel/:hostelId', isOwnerOrAdmin, getHostelVisitors);
router.put('/visitor/:visitorId/status', isOwnerOrAdmin, updateVisitorStatus);

export default router;
