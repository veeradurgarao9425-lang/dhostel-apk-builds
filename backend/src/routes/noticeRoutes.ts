import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getNotices,
  createNotice,
  deleteNotice
} from '../controllers/noticeController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getNotices);
router.post('/', createNotice);
router.delete('/:noticeId', deleteNotice);

export default router;
