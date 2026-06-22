import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
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

// All routes require authentication
router.use(authMiddleware);

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
router.get('/download/excel', downloadExcelReport);

// Email the Excel report to the logged-in user's own email address
router.post('/email-excel', emailExcelReport);

export default router;
