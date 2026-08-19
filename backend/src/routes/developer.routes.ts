import { Router } from 'express';
import { developerController } from '../controllers/developerController.js';
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

// Owners Management
router.get('/owners', developerController.getOwners);
router.get('/owners/:id', developerController.getOwnerDetails);
router.put('/owners/:id/status', developerController.updateOwnerStatus);

// Students / Tenants Management
router.get('/students', developerController.getStudents);
router.get('/students/:id', developerController.getStudentDetails);

// Rooms & Beds Inventory
router.get('/rooms-beds', developerController.getRoomsAndBeds);

// Payments & Ledger
router.get('/payments', developerController.getPayments);

// Support & Impersonation Sessions
router.post('/support-sessions', developerController.createSupportSession);
router.post('/support-sessions/exit', developerController.exitSupportSession);
router.get('/support-sessions/active', developerController.getActiveSupportSessions);

// Audit Logs
router.get('/audit-logs', developerController.getAuditLogs);

// System Health Diagnostics
router.get('/system/status', developerController.getSystemStatus);

export default router;
