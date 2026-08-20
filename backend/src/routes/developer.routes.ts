import { Router } from 'express';
import { developerController } from '../controllers/developerController.js';
import { developerFinanceController } from '../controllers/developerFinanceController.js';
import { developerAuthMiddleware } from '../middleware/developerAuth.js';

const router = Router();

// ─── 1. Public Authentication ────────────────────────────────────────────────
router.post('/auth/login', developerController.login);

// ─── 2. Protected Developer Routes ──────────────────────────────────────────
router.use(developerAuthMiddleware);

// Session & Profile
router.post('/auth/logout', developerController.logout);
router.get('/auth/me', developerController.me);

// Platform Overview & Dashboard
router.get('/dashboard', developerController.getDashboardMetrics);
router.get('/search', developerController.globalSearch);

// Hostels Management
router.get('/hostels', developerController.getHostels);
router.get('/hostels/:id', developerController.getHostelDetails);
router.put('/hostels/:id/status', developerController.updateHostelStatus);
router.post('/hostels/:id/extend-trial', developerController.extendHostelTrial);

// Owners Management
router.get('/owners', developerController.getOwners);
router.get('/owners/:id', developerController.getOwnerDetails);
router.put('/owners/:id/status', developerController.updateOwnerStatus);
router.post('/owners/:id/reset-password', developerController.resetOwnerPassword);

// Students / Tenants Management
router.get('/students', developerController.getStudents);
router.get('/students/:id', developerController.getStudentDetails);
router.put('/students/:id/status', developerController.updateStudentStatus);
router.post('/students/:id/reset-password', developerController.resetStudentPassword);

// Rooms & Beds Inventory
router.get('/rooms-beds', developerController.getRoomsAndBeds);

// Payments & Ledger
router.get('/payments', developerController.getPayments);

// Support & Impersonation Sessions
router.post('/support-sessions', developerController.createSupportSession);
router.post('/support-sessions/exit', developerController.exitSupportSession);
router.get('/support-sessions/active', developerController.getActiveSupportSessions);

// ─── Platform Money Management (developer ↔ hostel SaaS billing) ────────────
router.get('/finance/overview', developerFinanceController.getOverview);
router.get('/finance/billing', developerFinanceController.getBilling);
router.put('/finance/billing/:hostelId', developerFinanceController.upsertBilling);
router.get('/finance/billing/:hostelId/payments', developerFinanceController.getPaymentHistory);
router.post('/finance/billing/:hostelId/payments', developerFinanceController.recordPayment);
router.delete('/finance/payments/:paymentId', developerFinanceController.deletePayment);
router.get('/finance/dues', developerFinanceController.getDues);

// Platform / infrastructure expenses (developer's own costs)
router.get('/finance/expenses', developerFinanceController.getExpenses);
router.post('/finance/expenses', developerFinanceController.createExpense);
router.put('/finance/expenses/:id', developerFinanceController.updateExpense);
router.delete('/finance/expenses/:id', developerFinanceController.deleteExpense);

// Developer Notification Centre
router.get('/notifications', developerFinanceController.getNotifications);
router.put('/notifications/read-all', developerFinanceController.markAllNotificationsRead);
router.put('/notifications/:id/read', developerFinanceController.markNotificationRead);

// Audit Logs
router.get('/audit-logs', developerController.getAuditLogs);

// System Health Diagnostics
router.get('/system/status', developerController.getSystemStatus);

export default router;
