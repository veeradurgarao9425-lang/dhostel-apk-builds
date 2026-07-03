import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const getTenantExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role_id !== 3) {
      return res.status(403).json({ success: false, error: 'Unauthorized. Only tenants can access personal expenses.' });
    }

    const expenses = await db('tenant_expenses')
      .where('student_id', user.user_id)
      .orderBy('date', 'desc')
      .orderBy('created_at', 'desc');

    return res.json({ success: true, data: expenses });
  } catch (error: any) {
    console.error('Error fetching tenant expenses:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch personal expenses.' });
  }
};

export const createTenantExpense = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role_id !== 3) {
      return res.status(403).json({ success: false, error: 'Unauthorized.' });
    }

    const { title, amount, category, date, payment_mode } = req.body;

    if (!title || !amount || !category || !date) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Ensure the date is formatted as YYYY-MM-DD to avoid MySQL strict mode parsing errors with full ISO 8601 strings
    const formattedDate = typeof date === 'string' ? date.split('T')[0] : date;

    const [expense_id] = await db('tenant_expenses').insert({
      student_id: user.user_id,
      title,
      amount: parseFloat(amount),
      category,
      date: formattedDate,
      payment_mode: payment_mode || 'Cash',
      created_at: new Date(),
      updated_at: new Date()
    });

    const newExpense = await db('tenant_expenses').where('expense_id', expense_id).first();

    return res.status(201).json({ success: true, data: newExpense, message: 'Expense added successfully' });
  } catch (error: any) {
    console.error('Error adding tenant expense:', error);
    return res.status(500).json({ success: false, error: 'Failed to add expense.' });
  }
};

export const getSavingGoal = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role_id !== 3) {
      return res.status(403).json({ success: false, error: 'Unauthorized.' });
    }

    let goal = await db('tenant_saving_goals').where('student_id', user.user_id).first();
    
    // Default fallback if not found
    if (!goal) {
      goal = { student_id: user.user_id, amount: 0 };
    }

    return res.json({ success: true, data: goal });
  } catch (error: any) {
    if (error?.code === 'ER_NO_SUCH_TABLE') return res.json({ success: true, data: { amount: 0 } });
    console.error('Error fetching saving goal:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch saving goal.' });
  }
};

export const updateSavingGoal = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role_id !== 3) {
      return res.status(403).json({ success: false, error: 'Unauthorized.' });
    }

    const { amount } = req.body;
    if (amount === undefined || amount === null) {
      return res.status(400).json({ success: false, error: 'Amount is required' });
    }

    const existing = await db('tenant_saving_goals').where('student_id', user.user_id).first();

    if (existing) {
      await db('tenant_saving_goals')
        .where('student_id', user.user_id)
        .update({ amount: parseFloat(amount), updated_at: new Date() });
    } else {
      await db('tenant_saving_goals').insert({
        student_id: user.user_id,
        amount: parseFloat(amount),
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    const updated = await db('tenant_saving_goals').where('student_id', user.user_id).first();
    return res.json({ success: true, data: updated, message: 'Saving goal updated successfully' });
  } catch (error: any) {
    console.error('Error updating saving goal:', error);
    return res.status(500).json({ success: false, error: 'Failed to update saving goal.' });
  }
};
