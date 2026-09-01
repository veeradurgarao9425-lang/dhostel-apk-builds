import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { getAuthenticatedStudentId } from '../utils/scope.js';
import { sendNotificationToStudent } from '../utils/notification.js';
import { io } from '../socket/index.js';

export const getTenantExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role_id !== 3) {
      return res.status(403).json({ success: false, error: 'Unauthorized. Only tenants can access personal expenses.' });
    }

    const student_id = await getAuthenticatedStudentId(user) || user.user_id;
    const expenses = await db('tenant_expenses')
      .where('student_id', student_id)
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
    const parsedAmount = parseFloat(amount);

    const student_id = await getAuthenticatedStudentId(user) || user.user_id;
    const [expense_id] = await db('tenant_expenses').insert({
      student_id,
      title,
      amount: parsedAmount,
      category,
      date: formattedDate,
      payment_mode: payment_mode || 'Cash',
      created_at: new Date(),
      updated_at: new Date()
    });

    const newExpense = await db('tenant_expenses').where('expense_id', expense_id).first();

    // Trigger push notification to tenant
    try {
      if (student_id) {
        if (io) {
          io.to(`tenant_${student_id}`).emit('expense_added', { expense_id, title, amount: parsedAmount, category });
          io.to(`tenant_${student_id}`).emit('REFRESH_NOTIFICATIONS');
        }

        // 1. Send confirmation notification
        await sendNotificationToStudent(
          student_id,
          'Expense Alert',
          'Expense Logged 💸',
          `₹${parsedAmount} spent on ${category} (${title}) has been recorded.`,
          'Low',
          { expense_id, category, amount: parsedAmount },
          { screen: 'Expenses', referenceType: 'expense', referenceId: expense_id }
        );

        // 2. Check if this pushes them past their monthly budget
        const budgetRow = await db('tenant_budgets').where('student_id', student_id).first().catch(() => null);
        if (budgetRow && Number(budgetRow.amount) > 0) {
          const budgetAmount = Number(budgetRow.amount);
          const currentMonthStart = new Date().toISOString().slice(0, 7) + '-01';
          const totalSpentRes = await db('tenant_expenses')
            .where('student_id', student_id)
            .andWhere('date', '>=', currentMonthStart)
            .sum('amount as total')
            .first()
            .catch(() => null);

          const totalSpent = Number(totalSpentRes?.total || 0);
          if (totalSpent >= budgetAmount) {
            await sendNotificationToStudent(
              student_id,
              'Budget Alert',
              '⚠️ Budget Exceeded!',
              `You have spent ₹${totalSpent} this month, exceeding your budget of ₹${budgetAmount}.`,
              'High',
              { totalSpent, budgetAmount },
              { screen: 'Expenses' }
            );
          } else if (totalSpent >= budgetAmount * 0.8) {
            await sendNotificationToStudent(
              student_id,
              'Budget Alert',
              '⚠️ 80% Budget Reached',
              `You have spent ₹${totalSpent} (${Math.round((totalSpent / budgetAmount) * 100)}%) of your ₹${budgetAmount} budget.`,
              'Medium',
              { totalSpent, budgetAmount },
              { screen: 'Expenses' }
            );
          }
        }
      }
    } catch (notifErr) {
      console.warn('Tenant expense notification notice:', notifErr);
    }

    return res.status(201).json({ success: true, data: newExpense, message: 'Expense added successfully' });
  } catch (error: any) {
    console.error('Error adding tenant expense:', error);
    return res.status(500).json({ success: false, error: 'Failed to add expense.' });
  }
};


const ensureBudgetsTable = async () => {
  try {
    const exists = await db.schema.hasTable('tenant_budgets');
    if (!exists) {
      await db.schema.createTable('tenant_budgets', (t) => {
        t.increments('id').primary();
        t.integer('student_id').notNullable().index();
        t.decimal('amount', 12, 2).defaultTo(0);
        t.timestamps(true, true);
      });
    }
  } catch (_) {}
};

const ensureGoalsTable = async () => {
  try {
    const exists = await db.schema.hasTable('tenant_saving_goals');
    if (!exists) {
      await db.schema.createTable('tenant_saving_goals', (t) => {
        t.increments('id').primary();
        t.integer('student_id').notNullable().index();
        t.string('name', 255).defaultTo('Savings Goal');
        t.decimal('amount', 12, 2).defaultTo(0);
        t.decimal('saved_amount', 12, 2).defaultTo(0);
        t.timestamps(true, true);
      });
    }
  } catch (_) {}
};

export const getSavingGoal = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role_id !== 3) {
      return res.status(403).json({ success: false, error: 'Unauthorized.' });
    }

    await ensureGoalsTable();

    const student_id = await getAuthenticatedStudentId(user) || user.user_id;
    let goal = await db('tenant_saving_goals').where('student_id', student_id).first().catch(() => null);
    
    // Default fallback if not found
    if (!goal) {
      goal = { student_id, name: 'Savings Goal', amount: 0, saved_amount: 0 };
    }

    return res.json({ success: true, data: goal });
  } catch (error: any) {
    return res.json({ success: true, data: { name: 'Savings Goal', amount: 0, saved_amount: 0 } });
  }
};

export const updateSavingGoal = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role_id !== 3) {
      return res.status(403).json({ success: false, error: 'Unauthorized.' });
    }

    const { amount, name, saved_amount } = req.body;
    if (amount === undefined || amount === null) {
      return res.status(400).json({ success: false, error: 'Amount is required' });
    }

    await ensureGoalsTable();

    const student_id = await getAuthenticatedStudentId(user) || user.user_id;
    const existing = await db('tenant_saving_goals').where('student_id', student_id).first().catch(() => null);

    if (existing) {
      await db('tenant_saving_goals')
        .where('student_id', student_id)
        .update({ 
          amount: parseFloat(amount), 
          name: name || existing.name, 
          saved_amount: saved_amount !== undefined ? parseFloat(saved_amount) : existing.saved_amount,
          updated_at: new Date() 
        });
    } else {
      await db('tenant_saving_goals').insert({
        student_id,
        name: name || 'Savings Goal',
        amount: parseFloat(amount),
        saved_amount: saved_amount !== undefined ? parseFloat(saved_amount) : 0,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    const updated = await db('tenant_saving_goals').where('student_id', student_id).first().catch(() => null);
    return res.json({ success: true, data: updated || { amount: parseFloat(amount), name: name || 'Savings Goal' }, message: 'Saving goal updated successfully' });
  } catch (error: any) {
    console.error('Error updating saving goal:', error);
    return res.status(500).json({ success: false, error: 'Failed to update saving goal.' });
  }
};

export const getTenantBudget = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role_id !== 3) {
      return res.status(403).json({ success: false, error: 'Unauthorized.' });
    }

    await ensureBudgetsTable();

    const student_id = await getAuthenticatedStudentId(user) || user.user_id;
    let budget = await db('tenant_budgets').where('student_id', student_id).first().catch(() => null);
    
    // Default fallback if not found
    if (!budget) {
      budget = { student_id, amount: 0 };
    }

    return res.json({ success: true, data: budget });
  } catch (error: any) {
    return res.json({ success: true, data: { amount: 0 } });
  }
};

export const updateTenantBudget = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role_id !== 3) {
      return res.status(403).json({ success: false, error: 'Unauthorized.' });
    }

    const { amount } = req.body;
    if (amount === undefined || amount === null) {
      return res.status(400).json({ success: false, error: 'Amount is required' });
    }

    await ensureBudgetsTable();

    const student_id = await getAuthenticatedStudentId(user) || user.user_id;
    const existing = await db('tenant_budgets').where('student_id', student_id).first().catch(() => null);

    if (existing) {
      await db('tenant_budgets')
        .where('student_id', student_id)
        .update({ amount: parseFloat(amount), updated_at: new Date() });
    } else {
      await db('tenant_budgets').insert({
        student_id,
        amount: parseFloat(amount),
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    const updated = await db('tenant_budgets').where('student_id', student_id).first().catch(() => null);

    // Send confirmation push notification to tenant
    try {
      if (student_id) {
        if (io) {
          io.to(`tenant_${student_id}`).emit('budget_updated', { amount: parseFloat(amount) });
          io.to(`tenant_${student_id}`).emit('REFRESH_NOTIFICATIONS');
        }
        await sendNotificationToStudent(
          student_id,
          'Budget Alert',
          'Monthly Budget Set 🎯',
          `Your monthly budget of ₹${parseFloat(amount).toLocaleString('en-IN')} has been set. We will alert you at 80% and 100% spending.`,
          'Medium',
          { budgetAmount: parseFloat(amount) },
          { screen: 'Expenses' }
        );
      }
    } catch (notifErr) {
      console.warn('Budget notification error:', notifErr);
    }

    return res.json({ success: true, data: updated || { amount: parseFloat(amount) }, message: 'Tenant budget updated successfully' });
  } catch (error: any) {
    console.error('Error updating tenant budget:', error);
    return res.status(500).json({ success: false, error: 'Failed to update tenant budget.' });
  }
};


