import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import { getTenantExpenses, createTenantExpense, getSavingGoal, updateSavingGoal, getTenantBudget, updateTenantBudget } from '../controllers/tenantExpenseController.js';

const router = express.Router();

router.use(authMiddleware, requireActiveSubscription);

router.get('/', getTenantExpenses);
router.post('/', createTenantExpense);
router.get('/goal', getSavingGoal);
router.post('/goal', updateSavingGoal);

router.get('/budget', getTenantBudget);
router.post('/budget', updateTenantBudget);

export default router;
