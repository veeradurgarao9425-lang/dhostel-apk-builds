import express from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware } from '../middleware/auth.js';
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

router.use(authMiddleware);

// Notice Categories
router.get('/categories', getNoticeCategories);
router.post('/categories', createNoticeCategory);
router.delete('/categories/:categoryName', deleteNoticeCategory);

// Notices
router.get('/', getNotices);
router.post('/', upload.single('image'), createNotice);
router.put('/:noticeId', upload.single('image'), updateNotice);
router.delete('/:noticeId', deleteNotice);

export default router;
