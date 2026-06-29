import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getRoomChatDetails, getMessages, uploadMedia } from '../controllers/chatController.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'uploads/chat';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit for images/audio
});

router.use(authMiddleware);

router.get('/room/:roomId', getRoomChatDetails);
router.get('/messages/:roomId', getMessages);
router.post('/upload', upload.single('file'), uploadMedia);

export default router;
