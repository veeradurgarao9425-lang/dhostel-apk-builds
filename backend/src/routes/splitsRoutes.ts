import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getSplitsState, addMember, removeMember, addExpense, removeExpense, settleAll } from '../controllers/splitsController.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getSplitsState);
router.post('/members', addMember);
router.delete('/members/:memberId', removeMember);
router.post('/expenses', addExpense);
router.delete('/expenses/:expenseId', removeExpense);
router.post('/settle', settleAll);

export default router;
