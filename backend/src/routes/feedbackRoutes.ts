import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { submitFeedback, getFeedbacks, sendFeedbackPrompt } from '../controllers/feedbackController.js';
import { optionalAuthMiddleware, isMasterAdmin } from '../middleware/auth.js';

const router = Router();

const uploadsDir = 'uploads/';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `feedback-${Date.now()}-${Math.round(Math.random() * 1e4)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Public / Authenticated submit feedback route
router.post('/', optionalAuthMiddleware, upload.array('images', 3), submitFeedback);

// Dispatch feedback request notification to user
router.post('/send-request', optionalAuthMiddleware, sendFeedbackPrompt);

// Developer / Admin view feedbacks route
router.get('/', isMasterAdmin, getFeedbacks);

export default router;
