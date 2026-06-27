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

    const [expense_id] = await db('tenant_expenses').insert({
      student_id: user.user_id,
      title,
      amount: parseFloat(amount),
      category,
      date,
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
