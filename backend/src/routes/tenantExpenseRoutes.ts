import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getTenantExpenses, createTenantExpense } from '../controllers/tenantExpenseController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getTenantExpenses);
router.post('/', createTenantExpense);

export default router;
