import express from 'express';
import { authMiddleware, queryTokenMiddleware, isOwnerOrAdmin } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import {
  getDashboardStats,
  getIncomeReport,
  getExpenseReport,
  getProfitLoss,
  getOccupancyTrends,
  getPaymentCollectionReport,
  getOwnerStats,
  getMonthlyOverview
} from '../controllers/reportController.js';
import {
  downloadPDFReport,
  downloadExcelReport,
  emailExcelReport
} from '../controllers/reportDownloadController.js';

const router = express.Router();

// Allow public downloads verified via query parameter token (?token=...) and restrict to owner/admin
router.get('/download/excel', queryTokenMiddleware, isOwnerOrAdmin, downloadExcelReport);

// All other routes require authentication header and owner/admin access
router.use(authMiddleware, requireActiveSubscription, isOwnerOrAdmin);

// Report routes
router.get('/dashboard-stats', getDashboardStats);
router.get('/owner-stats', getOwnerStats);
router.get('/income', getIncomeReport);
router.get('/expenses', getExpenseReport);
router.get('/profit-loss', getProfitLoss);
router.get('/occupancy-trends', getOccupancyTrends);
router.get('/payment-collection', getPaymentCollectionReport);
router.get('/monthly-overview', getMonthlyOverview);

// Download routes
router.get('/download/pdf', downloadPDFReport);

// Email the Excel report to the logged-in user's own email address
router.post('/email-excel', emailExcelReport);

export default router;
