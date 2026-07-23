import express from 'express';
import { authMiddleware, queryTokenMiddleware, isOwnerOrAdmin } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import {
  getAllIncome,
  createIncome,
  updateIncome,
  deleteIncome,
  getIncomeSummary,
  getIncomeAnalytics,
  getIncomeExport,
  emailIncomeExport
} from '../controllers/incomeController.js';

const router = express.Router();

// Export route only requires query token, so it goes before the global authMiddleware
router.get('/export', queryTokenMiddleware, isOwnerOrAdmin, getIncomeExport);

// All other routes require authentication header and owner/admin access
router.use(authMiddleware, requireActiveSubscription, isOwnerOrAdmin);

// Income routes
router.post('/email-export', emailIncomeExport);
router.get('/', getAllIncome);
router.post('/', createIncome);
router.put('/:incomeId', updateIncome);
router.delete('/:incomeId', deleteIncome);
router.get('/summary', getIncomeSummary);
router.get('/analytics', getIncomeAnalytics);

export default router;
