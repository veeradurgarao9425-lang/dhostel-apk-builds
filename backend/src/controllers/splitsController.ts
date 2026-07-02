import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import db from '../config/database.js';

const YOU_ID = 'you';

const safeQuery = async (fn: () => Promise<any>, fallback: any) => {
  try { return await fn(); }
  catch (e: any) {
    if (e?.code === 'ER_NO_SUCH_TABLE') return fallback;
    throw e;
  }
};

export const getSplitsState = async (req: AuthRequest, res: Response) => {
  try {
    const student_id = req.user?.user_id;
    const members = await safeQuery(
      () => db('splits_members').where({ student_id }).orderBy('created_at', 'asc'),
      []
    );
    const expenses = await safeQuery(
      () => db('splits_expenses').where({ student_id }).orderBy('created_at', 'desc'),
      []
    );
    // Parse JSON fields
    const parsedExpenses = expenses.map((e: any) => ({
      ...e,
      participantIds: (() => { try { return JSON.parse(e.participant_ids); } catch { return []; } })(),
    }));
    res.json({ success: true, data: { members, expenses: parsedExpenses } });
  } catch (error: any) {
    console.error('getSplitsState error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const student_id = req.user?.user_id;
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required' });

    const member_id = `m-${Date.now()}`;
    await safeQuery(
      () => db('splits_members').insert({ student_id, member_id, name: name.trim(), created_at: new Date() }),
      null
    );
    res.status(201).json({ success: true, data: { member_id, name: name.trim() } });
  } catch (error: any) {
    console.error('addMember error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const student_id = req.user?.user_id;
    const { memberId } = req.params;
    if (memberId === YOU_ID) return res.status(400).json({ success: false, message: 'Cannot remove yourself' });
    await safeQuery(() => db('splits_members').where({ student_id, member_id: memberId }).del(), null);
    // Also remove from expenses participant lists
    const expenses = await safeQuery(
      () => db('splits_expenses').where({ student_id }),
      []
    );
    for (const e of expenses) {
      const participants: string[] = (() => { try { return JSON.parse(e.participant_ids); } catch { return []; } })();
      const updated = participants.filter((p: string) => p !== memberId);
      await safeQuery(
        () => db('splits_expenses').where({ expense_id: e.expense_id }).update({ participant_ids: JSON.stringify(updated) }),
        null
      );
    }
    // Remove expenses paid by the removed member
    await safeQuery(() => db('splits_expenses').where({ student_id, paid_by_id: memberId }).del(), null);
    res.json({ success: true });
  } catch (error: any) {
    console.error('removeMember error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const addExpense = async (req: AuthRequest, res: Response) => {
  try {
    const student_id = req.user?.user_id;
    const { title, amount, paidById, participantIds } = req.body;
    if (!title?.trim() || !amount || !participantIds?.length) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const expense_id = `e-${Date.now()}`;
    await safeQuery(
      () => db('splits_expenses').insert({
        student_id,
        expense_id,
        title: title.trim(),
        amount: parseFloat(amount),
        paid_by_id: paidById || YOU_ID,
        participant_ids: JSON.stringify(participantIds),
        expense_date: new Date().toISOString().slice(0, 10),
        created_at: new Date(),
      }),
      null
    );
    res.status(201).json({ success: true, data: { expense_id } });
  } catch (error: any) {
    console.error('addExpense error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const removeExpense = async (req: AuthRequest, res: Response) => {
  try {
    const student_id = req.user?.user_id;
    const { expenseId } = req.params;
    await safeQuery(() => db('splits_expenses').where({ student_id, expense_id: expenseId }).del(), null);
    res.json({ success: true });
  } catch (error: any) {
    console.error('removeExpense error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const settleAll = async (req: AuthRequest, res: Response) => {
  try {
    const student_id = req.user?.user_id;
    await safeQuery(() => db('splits_expenses').where({ student_id }).del(), null);
    res.json({ success: true, message: 'All expenses settled' });
  } catch (error: any) {
    console.error('settleAll error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
