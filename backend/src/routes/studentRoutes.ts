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
import multer from 'multer';

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }
});

const studentUpload = upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'id_proof_front', maxCount: 1 },
  { name: 'id_proof_back', maxCount: 1 }
]);

router.get('/', isOwnerOrAdmin, getStudents);
router.get('/:studentId', isOwnerOrAdmin, getStudentById);
router.post('/', isOwnerOrAdmin, studentUpload, createStudent);
router.put('/:studentId', isOwnerOrAdmin, studentUpload, updateStudent);
router.delete('/:studentId', isOwnerOrAdmin, deleteStudent);
router.post('/:studentId/allocate-room', isOwnerOrAdmin, allocateRoom);
router.post('/:studentId/reject-registration', isOwnerOrAdmin, rejectRegistration);
router.post('/:studentId/vacate-settlement', isOwnerOrAdmin, vacateSettlement);

export default router;
