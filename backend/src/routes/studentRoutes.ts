import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getStudents,
  getStudentStats,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  allocateRoom,
  getPendingRegistrations,
} from '../controllers/studentController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Owner: get tenants awaiting activation (status=3 / mobile self-register)
router.get('/pending-registrations', getPendingRegistrations);

// Student routes
router.get('/stats', getStudentStats);
router.get('/', getStudents);
router.get('/:studentId', getStudentById);
router.post('/', createStudent);
router.put('/:studentId', updateStudent);
router.delete('/:studentId', deleteStudent);
router.post('/:studentId/allocate-room', allocateRoom);

export default router;
