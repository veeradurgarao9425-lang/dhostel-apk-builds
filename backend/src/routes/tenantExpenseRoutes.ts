import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getTenantExpenses, createTenantExpense, getSavingGoal, updateSavingGoal } from '../controllers/tenantExpenseController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getTenantExpenses);
router.post('/', createTenantExpense);
router.get('/goal', getSavingGoal);
router.post('/goal', updateSavingGoal);

export default router;
