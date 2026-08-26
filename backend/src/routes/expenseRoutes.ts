import express from 'express';
import multer from 'multer';
import { authMiddleware, isOwnerOrAdmin } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseCategories,
  createExpenseCategory,
  getExpenseSummary
} from '../controllers/expenseController.js';

import fs from 'fs';

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads', { recursive: true });
    }
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'expense-' + uniqueSuffix + '-' + (file.originalname || 'receipt.jpg').replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

// All routes require authentication and owner/admin access
router.use(authMiddleware, requireActiveSubscription, isOwnerOrAdmin);

// Expense routes
router.get('/', getExpenses);
router.get('/categories', getExpenseCategories);
router.post('/categories', createExpenseCategory);
router.get('/summary', getExpenseSummary);
router.get('/:expenseId', getExpenseById);
router.post('/', upload.single('attachment'), createExpense);
router.put('/:expenseId', upload.single('attachment'), updateExpense);
router.delete('/:expenseId', deleteExpense);

export default router;

