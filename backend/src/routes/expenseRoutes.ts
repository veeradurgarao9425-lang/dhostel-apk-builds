import express from 'express';
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

const router = express.Router();

// All routes require authentication and owner/admin access
router.use(authMiddleware, requireActiveSubscription, isOwnerOrAdmin);

// Expense routes
router.get('/', getExpenses);
router.get('/categories', getExpenseCategories);
router.post('/categories', createExpenseCategory);
router.get('/summary', getExpenseSummary);
router.get('/:expenseId', getExpenseById);
router.post('/', createExpense);
router.put('/:expenseId', updateExpense);
router.delete('/:expenseId', deleteExpense);

export default router;
