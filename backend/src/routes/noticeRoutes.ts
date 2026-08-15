import express from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware, isOwnerOrAdmin } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import {
  getNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  getNoticeCategories,
  createNoticeCategory,
  deleteNoticeCategory
} from '../controllers/noticeController.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `notice-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = express.Router();

router.use(authMiddleware, requireActiveSubscription);

// Notice Categories
router.get('/categories', getNoticeCategories);
router.post('/categories', isOwnerOrAdmin, createNoticeCategory);
router.delete('/categories/:categoryName', isOwnerOrAdmin, deleteNoticeCategory);

// Notices
router.get('/', getNotices);
router.post('/', isOwnerOrAdmin, upload.single('image'), createNotice);
router.put('/:noticeId', isOwnerOrAdmin, upload.single('image'), updateNotice);
router.delete('/:noticeId', isOwnerOrAdmin, deleteNotice);

export default router;
