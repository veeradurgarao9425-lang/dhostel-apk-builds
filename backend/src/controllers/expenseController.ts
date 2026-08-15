import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { resolveScopedHostelId, resolveOwnerHostelId } from '../utils/scope.js';

// Get all expenses
export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, categoryId, startDate, endDate, page, limit, search } = req.query;
    const user = req.user;

    // Owner (role 2): validate BOTH user_id AND hostel_id together in DB.
    // Admin/Super Admin (role 1): scoped to ?hostelId if given, otherwise global.
    const { hostelId: scopedHostelId, error: hostelError } = await resolveOwnerHostelId(user, hostelId as string | undefined);
    if (hostelError) {
      return res.status(403).json({ success: false, error: hostelError });
    }
    // Auto-carry forward only applies to a single, specific hostel — skipped
    // when Admin is viewing globally (no hostel resolved).
    const hostel_id: number | undefined = scopedHostelId ?? undefined;

    // Auto-carry forward logic for current month
    if (hostel_id) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonthNum = now.getMonth() + 1;
      const currentMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
      const initKey = `expenses_init_${hostel_id}_${currentMonthStr}`;

      try {
        const isInitialized = await db('app_settings')
          .where('setting_key', initKey)
          .first();

        if (!isInitialized) {
          // Mark as initialized first to prevent multiple simultaneous requests from race-cloning
          await db('app_settings').insert({
            setting_key: initKey,
            setting_value: 'true',
            description: `Auto-expenses cloned status for hostel ${hostel_id} for ${currentMonthStr}`
          });

          // Check if current month has 0 expenses
          const lastDayCurrent = new Date(currentYear, currentMonthNum, 0).getDate();
          const startDateCurrent = `${currentMonthStr}-01`;
          const endDateCurrent = `${currentMonthStr}-${String(lastDayCurrent).padStart(2, '0')}`;

          const currentMonthCount = await db('expenses')
            .where('hostel_id', hostel_id)
            .whereBetween('expense_date', [startDateCurrent, endDateCurrent])
            .count('expense_id as count')
            .first();

          const count = parseInt(currentMonthCount?.count?.toString() || '0');

          if (count === 0) {
            // Find previous month
            const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
            const prevYear = currentMonthNum === 1 ? currentYear - 1 : currentYear;
            const prevMonthStr = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;

            const lastDayPrev = new Date(prevYear, prevMonthNum, 0).getDate();
            const startDatePrev = `${prevMonthStr}-01`;
            const endDatePrev = `${prevMonthStr}-${String(lastDayPrev).padStart(2, '0')}`;

            // Fetch previous month's expenses
            const prevExpenses = await db('expenses')
              .where('hostel_id', hostel_id)
              .whereBetween('expense_date', [startDatePrev, endDatePrev]);

            if (prevExpenses && prevExpenses.length > 0) {
              // Clone expenses to the current month, preserving original day of month.
              // If the day doesn't exist in the current month (e.g. Jan 31 → Feb), clamp to last valid day.
              const lastDayCurrent = new Date(currentYear, currentMonthNum, 0).getDate();
              const newExpenses = prevExpenses.map(exp => {
                const origDate = new Date(exp.expense_date);
                const origDay = origDate.getDate();
                const clampedDay = Math.min(origDay, lastDayCurrent);
                const clonedDate = `${currentMonthStr}-${String(clampedDay).padStart(2, '0')}`;
                return {
                  hostel_id: exp.hostel_id,
                  category_id: exp.category_id,
                  expense_date: clonedDate,
                  amount: exp.amount,
                  payment_mode_id: exp.payment_mode_id,
                  vendor_name: exp.vendor_name,
                  description: exp.description ? `${exp.description} (auto-cloned)` : 'Auto-cloned from previous month',
                  bill_number: exp.bill_number,
                  created_by: exp.created_by,
                  created_at: new Date()
                };
              });

              await db('expenses').insert(newExpenses);
              console.log(`Auto-cloned ${newExpenses.length} expenses for hostel ${hostel_id} from ${prevMonthStr} to ${currentMonthStr} (preserving original days)`);
            }
          }
        }
      } catch (err: any) {
        console.error('Error in auto-carry forward logic:', err);
      }
    }

    let query = db('expenses as e')
      .leftJoin('hostel_master as h', 'e.hostel_id', 'h.hostel_id')
      .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .leftJoin('payment_modes as pm', 'e.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'e.*',
        'h.hostel_name',
        'ec.category_name',
        'pm.payment_mode_name as payment_mode'
      );


    if (scopedHostelId) {
      query = query.where('e.hostel_id', scopedHostelId);
    }

    // Apply filters
    if (categoryId) {
      query = query.where('e.category_id', categoryId);
    }

    if (startDate && endDate) {
      query = query.whereBetween('e.expense_date', [startDate, endDate]);
    }

    // Apply search filter if provided
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.where(function () {
        this.where('e.vendor_name', 'like', searchTerm)
          .orWhere('e.description', 'like', searchTerm)
          .orWhere('ec.category_name', 'like', searchTerm)
          .orWhere('e.bill_number', 'like', searchTerm);
      });
    }

    // Calculate total stats before pagination is applied
    let totalExpenses = 0;
    let monthExpensesTotal = 0;

    // resolvedHostelId: the single hostel to scope totals to, or undefined for
    // Admin/Super Admin viewing globally (in which case totals aggregate across
    // ALL hostels — no filter applied).
    const resolvedHostelId = scopedHostelId ?? undefined;
    {
      let allTimeQuery = db('expenses').sum('amount as total');
      if (resolvedHostelId) allTimeQuery = allTimeQuery.where('hostel_id', resolvedHostelId);
      const allTimeResult = await allTimeQuery.first();
      totalExpenses = parseFloat(allTimeResult?.total || 0);

      let mStart = startDate;
      let mEnd = endDate;
      if (!mStart || !mEnd) {
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth() + 1;
        const lastDay = new Date(curYear, curMonth, 0).getDate();
        mStart = `${curYear}-${String(curMonth).padStart(2, '0')}-01`;
        mEnd = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      }
      let monthQuery = db('expenses').whereBetween('expense_date', [mStart, mEnd]).sum('amount as total');
      if (resolvedHostelId) monthQuery = monthQuery.where('hostel_id', resolvedHostelId);
      const monthResult = await monthQuery.first();
      monthExpensesTotal = parseFloat(monthResult?.total || 0);

      // ── Fold staff wage payments into the totals so they reconcile with Overview ──
      try {
        let allWagesQuery = db('staff_payments').sum('amount as total');
        if (resolvedHostelId) allWagesQuery = allWagesQuery.where('hostel_id', resolvedHostelId);
        const allWages = await allWagesQuery.first();
        totalExpenses += parseFloat(allWages?.total || 0);

        let monthWagesQuery = db('staff_payments')
          .whereBetween('payment_date', [mStart, mEnd])
          .sum('amount as total');
        if (resolvedHostelId) monthWagesQuery = monthWagesQuery.where('hostel_id', resolvedHostelId);
        const monthWages = await monthWagesQuery.first();
        monthExpensesTotal += parseFloat(monthWages?.total || 0);
      } catch (e) { /* staff_payments table may not exist yet */ }
    }

    // Apply pagination
    if (page && limit) {
      const p = parseInt(page as string);
      const l = parseInt(limit as string);
      query = query.limit(l).offset((p - 1) * l);
    }

    const expenses = await query.orderBy('e.expense_date', 'desc');

    // Surface staff wages as expense line-items (first page / unfiltered only, to keep pagination intact)
    let wageRows: any[] = [];
    const isFirstPage = !page || parseInt(page as string) === 1;
    if (isFirstPage && !categoryId) {
      try {
        let wq = db('staff_payments as sp')
          .leftJoin('staff as st', 'sp.staff_id', 'st.staff_id')
          .select('sp.payment_id', 'sp.hostel_id', 'sp.amount', 'sp.payment_date', 'sp.note', 'st.full_name');
        if (resolvedHostelId) wq = wq.where('sp.hostel_id', resolvedHostelId);
        if (startDate && endDate) wq = wq.whereBetween('sp.payment_date', [startDate, endDate]);
        if (search) {
          const term = `%${search}%`;
          wq = wq.where(function () { this.where('st.full_name', 'like', term).orWhere('sp.note', 'like', term); });
        }
        const wages = await wq.orderBy('sp.payment_date', 'desc');
        wageRows = wages.map((w: any) => ({
          expense_id: `wage_${w.payment_id}`,
          hostel_id: w.hostel_id,
          category_name: 'Staff Wages',
          expense_date: w.payment_date,
          amount: w.amount,
          payment_mode: 'Cash',
          vendor_name: w.full_name || 'Staff',
          description: w.note || 'Wage payment',
          is_wage: true,
        }));
      } catch (e) { wageRows = []; }
    }

    const data = [...wageRows, ...expenses].sort((a, b) =>
      String(b.expense_date).localeCompare(String(a.expense_date))
    );

    res.json({
      success: true,
      data,
      totalExpenses,
      monthExpensesTotal
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expenses'
    });
  }
};

// Get expense by ID
export const getExpenseById = async (req: AuthRequest, res: Response) => {
  try {
    const { expenseId } = req.params;

    if (typeof expenseId === 'string' && expenseId.startsWith('wage_')) {
      const paymentId = parseInt(expenseId.replace('wage_', ''));
      const wage = await db('staff_payments as sp')
        .leftJoin('staff as st', 'sp.staff_id', 'st.staff_id')
        .leftJoin('hostel_master as h', 'sp.hostel_id', 'h.hostel_id')
        .select(
          'sp.payment_id',
          'sp.hostel_id',
          'sp.amount',
          'sp.payment_date as expense_date',
          'sp.note as description',
          'st.full_name as vendor_name',
          'h.hostel_name'
        )
        .where('sp.payment_id', paymentId)
        .first();

      if (!wage) {
        return res.status(404).json({
          success: false,
          error: 'Wage payment not found'
        });
      }

      if (req.user?.role_id === 2 && req.user?.hostel_id && wage.hostel_id !== req.user.hostel_id) {
        return res.status(403).json({ success: false, error: 'Access denied.' });
      }

      return res.json({
        success: true,
        data: {
          expense_id: `wage_${wage.payment_id}`,
          hostel_id: wage.hostel_id,
          category_name: 'Staff Wages',
          expense_date: wage.expense_date,
          amount: wage.amount,
          payment_mode: 'Cash',
          vendor_name: wage.vendor_name || 'Staff',
          description: wage.description || 'Wage payment',
          is_wage: true,
          hostel_name: wage.hostel_name
        }
      });
    }

    const expense = await db('expenses as e')
      .leftJoin('hostel_master as h', 'e.hostel_id', 'h.hostel_id')
      .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .leftJoin('payment_modes as pm', 'e.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'e.*',
        'h.hostel_name',
        'ec.category_name',
        'pm.payment_mode_name as payment_mode'
      )
      .where('e.expense_id', expenseId)
      .first();

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    if (req.user?.role_id === 2 && req.user?.hostel_id && expense.hostel_id !== req.user.hostel_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expense'
    });
  }
};

// Create new expense
export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const {
      category_id,
      expense_date,
      amount,
      payment_mode_id,
      vendor_name,
      description,
      bill_number
    } = req.body;

    // Validate required fields
    if (!category_id || !expense_date || !amount || !payment_mode_id) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: category_id, expense_date, amount, payment_mode_id'
      });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive number'
      });
    }

    // Determine hostel_id based on user role. Owner always uses their own
    // hostel; Admin/Super Admin must specify hostel_id explicitly (never
    // silently defaults to the admin's own possibly-stale hostel_id).
    let hostel_id: number;

    if (user?.role_id === 2) {
      // Hostel owner - use hostel from JWT
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostel_id = user.hostel_id;
    } else {
      // Admin - require hostel_id in request
      hostel_id = parseInt(req.body.hostel_id);
      if (!hostel_id) {
        return res.status(400).json({
          success: false,
          error: 'hostel_id is required for admin users'
        });
      }
    }

    const [expense_id] = await db('expenses').insert({
      hostel_id,
      category_id,
      expense_date,
      amount,
      payment_mode_id,
      vendor_name,
      description,
      bill_number,
      created_by: req.user?.user_id,
      created_at: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      data: { expense_id }
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record expense'
    });
  }
};

// Update expense
export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { expenseId } = req.params;

    if (typeof expenseId === 'string' && expenseId.startsWith('wage_')) {
      const paymentId = parseInt(expenseId.replace('wage_', ''));
      const payment = await db('staff_payments').where('payment_id', paymentId).first();
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Wage payment not found' });
      }
      if (req.user?.role_id === 2 && req.user?.hostel_id && payment.hostel_id !== req.user.hostel_id) {
        return res.status(403).json({ success: false, error: 'Access denied.' });
      }
      
      const { amount, expense_date, description } = req.body;
      const updateData: any = {};
      if (amount !== undefined) updateData.amount = Number(amount);
      if (expense_date !== undefined) updateData.payment_date = expense_date;
      if (description !== undefined) updateData.note = description;
      
      await db('staff_payments').where('payment_id', paymentId).update(updateData);
      return res.json({ success: true, message: 'Wage payment updated successfully' });
    }

    // Check if expense exists
    const expense = await db('expenses')
      .where('expense_id', expenseId)
      .first();

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    // Only Owner (role 2) is restricted to their own hostel's expense; Admin/Super
    // Admin (role 1) can update expenses for any hostel.
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      if (expense.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only update expenses for your own hostel.'
        });
      }
    }

    if (req.body.amount !== undefined && (isNaN(parseFloat(req.body.amount)) || parseFloat(req.body.amount) <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive number'
      });
    }

    const updateData: any = { updated_at: new Date() };

    const allowedFields = [
      'category_id', 'expense_date', 'amount', 'payment_mode_id',
      'vendor_name', 'description', 'bill_number'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    await db('expenses')
      .where({ expense_id: expenseId })
      .update(updateData);

    res.json({
      success: true,
      message: 'Expense updated successfully'
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update expense'
    });
  }
};

// Delete expense
export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { expenseId } = req.params;

    if (typeof expenseId === 'string' && expenseId.startsWith('wage_')) {
      const paymentId = parseInt(expenseId.replace('wage_', ''));
      const payment = await db('staff_payments').where('payment_id', paymentId).first();
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Wage payment not found' });
      }
      if (req.user?.role_id === 2 && req.user?.hostel_id && payment.hostel_id !== req.user.hostel_id) {
        return res.status(403).json({ success: false, error: 'Access denied.' });
      }
      await db('staff_payments').where('payment_id', paymentId).del();
      return res.json({ success: true, message: 'Wage payment deleted successfully' });
    }

    // Check if expense exists
    const expense = await db('expenses')
      .where('expense_id', expenseId)
      .first();

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    // Only Owner (role 2) is restricted to their own hostel's expense; Admin/Super
    // Admin (role 1) can delete expenses for any hostel.
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      if (expense.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete expenses for your own hostel.'
        });
      }
    }

    await db('expenses')
      .where({ expense_id: expenseId })
      .delete();

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete expense'
    });
  }
};

// Get expense categories
export const getExpenseCategories = async (req: AuthRequest, res: Response) => {
  try {
    // Check if order_index or sort_order column exists in the table
    const [columns] = await db.raw(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'expense_categories' 
      AND COLUMN_NAME IN ('order_index', 'sort_order')
    `);

    let categories;

    if (columns && columns.length > 0) {
      // Determine which column exists
      const hasOrderIndex = columns.some((col: any) => col.COLUMN_NAME === 'order_index');
      const orderColumn = hasOrderIndex ? 'order_index' : 'sort_order';
      
      // Order by order_index/sort_order first (using COALESCE to handle NULLs), then by category_name
      categories = await db('expense_categories')
        .select('*')
        .orderByRaw(`COALESCE(${orderColumn}, 999999) ASC`)
        .orderBy('category_name', 'asc');
    } else {
      // Fallback to category_name if order column doesn't exist
      categories = await db('expense_categories')
        .select('*')
        .orderBy('category_name', 'asc');
    }

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get expense categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expense categories'
    });
  }
};

// Create a new expense category (shared across all hostels, like the existing list)
export const createExpenseCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { category_name, description } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ success: false, error: 'Category name required' });
    }

    const [category_id] = await db('expense_categories').insert({
      category_name: category_name.trim(),
      description: description || null
    });

    res.status(201).json({
      success: true,
      message: 'Category added successfully',
      data: { category_id, category_name: category_name.trim(), description: description || null }
    });
  } catch (error: any) {
    console.error('Create expense category error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Category already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to add category' });
  }
};

// Get expense summary by category
export const getExpenseSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, startDate, endDate } = req.query;
    const user = req.user;

    let query = db('expenses as e')
      .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .select(
        'ec.category_name',
        'ec.category_id'
      )
      .sum('e.amount as total_amount')
      .count('e.expense_id as count')
      .groupBy('ec.category_id', 'ec.category_name');

    // Owner (role 2): validate BOTH user_id AND hostel_id together in DB.
    // Admin/Super Admin (role 1): scoped to ?hostelId if given, otherwise global.
    const { hostelId: scopedHostelId, error: hostelError } = await resolveOwnerHostelId(user, hostelId as string | undefined);
    if (hostelError) {
      return res.status(403).json({ success: false, error: hostelError });
    }
    if (scopedHostelId) {
      query = query.where('e.hostel_id', scopedHostelId);
    }

    if (startDate && endDate) {
      query = query.whereBetween('e.expense_date', [startDate, endDate]);
    }

    const summary = await query;

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get expense summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expense summary'
    });
  }
};
