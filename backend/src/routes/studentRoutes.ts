import express from 'express';
import { authMiddleware, isOwnerOrAdmin } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import {
  getStudents,
  getStudentStats,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  allocateRoom,
  rejectRegistration,
  getPendingRegistrations,
  submitVacateNotice,
  checkUnique,
  vacateSettlement,
} from '../controllers/studentController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware, requireActiveSubscription);

// Owner: get tenants awaiting activation (status=3 / mobile self-register)
router.get('/pending-registrations', isOwnerOrAdmin, getPendingRegistrations);

// Student routes
router.get('/check-unique', checkUnique); // Accessible by both owner (adding student) and tenant (registering)
router.get('/stats', isOwnerOrAdmin, getStudentStats);
router.post('/vacate', submitVacateNotice); // Tenant route
router.get('/', isOwnerOrAdmin, getStudents);
router.get('/:studentId', isOwnerOrAdmin, getStudentById);
router.post('/', isOwnerOrAdmin, createStudent);
router.put('/:studentId', isOwnerOrAdmin, updateStudent);
router.delete('/:studentId', isOwnerOrAdmin, deleteStudent);
router.post('/:studentId/allocate-room', isOwnerOrAdmin, allocateRoom);
router.post('/:studentId/reject-registration', isOwnerOrAdmin, rejectRegistration);
router.post('/:studentId/vacate-settlement', isOwnerOrAdmin, vacateSettlement);

export default router;
