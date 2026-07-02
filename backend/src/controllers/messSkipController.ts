import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import db from '../config/database.js';

// GET /api/mess/analytics — Owner sees skip percentages per meal per day
export const getMessAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const hostel_id = req.query.hostel_id || req.user?.hostel_id;
    if (!hostel_id) return res.status(400).json({ success: false, message: 'hostel_id required' });

    // Total active students in this hostel
    let totalStudents = 0;
    try {
      const r = await db('students').where({ hostel_id, status: 1 }).count('student_id as cnt').first();
      totalStudents = Number(r?.cnt || 0);
    } catch { /* ignore */ }

    if (totalStudents === 0) {
      return res.json({ success: true, data: { today: {}, trend: [], totalStudents: 0 } });
    }

    // Build last-7-days date list
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const today = days[days.length - 1];

    // Fetch skip rows for last 7 days for all students in this hostel
    let skipRows: any[] = [];
    try {
      skipRows = await db('mess_skips as ms')
        .join('students as s', 'ms.student_id', 's.student_id')
        .where('s.hostel_id', hostel_id)
        .where('ms.skipped', 1)
        .whereIn('ms.meal_date', days)
        .select('ms.meal_date', 'ms.meal_type')
        .orderBy('ms.meal_date', 'asc');
    } catch { /* table doesn't exist yet */ }

    // Group: { date -> { meal_type -> count } }
    const grouped: Record<string, Record<string, number>> = {};
    for (const row of skipRows) {
      if (!grouped[row.meal_date]) grouped[row.meal_date] = {};
      grouped[row.meal_date][row.meal_type] = (grouped[row.meal_date][row.meal_type] || 0) + 1;
    }

    const mealTypes = ['morning', 'lunch', 'dinner'];

    const toStats = (date: string) => {
      const dayData = grouped[date] || {};
      const out: Record<string, any> = {};
      for (const m of mealTypes) {
        const count = dayData[m] || 0;
        out[m] = {
          skipped: count,
          total: totalStudents,
          pct: totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0,
        };
      }
      return out;
    };

    const trend = days.map(date => ({
      date,
      label: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      ...toStats(date),
    }));

    res.json({
      success: true,
      data: {
        today: toStats(today),
        todayDate: today,
        trend,
        totalStudents,
      },
    });
  } catch (error: any) {
    console.error('getMessAnalytics error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const skipMeal = async (req: AuthRequest, res: Response) => {
  try {
    const student_id = req.user?.user_id;
    const { meal, skipped } = req.body;  // meal: 'morning'|'lunch'|'dinner', skipped: boolean
    if (!student_id || !meal) return res.status(400).json({ success: false, message: 'Missing fields' });

    const today = new Date().toISOString().slice(0, 10);

    // Upsert into mess_skips table
    const exists = await db('mess_skips').where({ student_id, meal_date: today, meal_type: meal }).first();
    if (exists) {
      await db('mess_skips').where({ student_id, meal_date: today, meal_type: meal }).update({ skipped: skipped ? 1 : 0 });
    } else {
      await db('mess_skips').insert({ student_id, meal_date: today, meal_type: meal, skipped: skipped ? 1 : 0 });
    }
    res.json({ success: true });
  } catch (error: any) {
    // Table might not exist yet — gracefully ignore
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ success: true });
    }
    console.error('Error saving mess skip:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getMySkips = async (req: AuthRequest, res: Response) => {
  try {
    const student_id = req.user?.user_id;
    const today = new Date().toISOString().slice(0, 10);
    const skips = await db('mess_skips').where({ student_id, meal_date: today });
    res.json({ success: true, data: skips });
  } catch (error: any) {
    if (error?.code === 'ER_NO_SUCH_TABLE') return res.json({ success: true, data: [] });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
