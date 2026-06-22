import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// Get all expenses
export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, categoryId, startDate, endDate, page, limit, search } = req.query;
    const user = req.user;

    // Resolve hostel_id based on user role
    let hostel_id: number | undefined;
    if ((user?.role_id === 2 || (user?.role_id === 1 && user?.hostel_id))) {
      if (user.hostel_id) {
        hostel_id = user.hostel_id;
      }
    } else if (hostelId) {
      hostel_id = parseInt(hostelId as string);
    }

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
              // Clone expenses to the 1st of the current month
              const clonedDate = `${currentMonthStr}-01`;
              const newExpenses = prevExpenses.map(exp => ({
                hostel_id: exp.hostel_id,
                category_id: exp.category_id,
                expense_date: clonedDate,
                amount: exp.amount,
                payment_mode_id: exp.payment_mode_id,
                vendor_name: exp.vendor_name,
                description: exp.description,
                bill_number: exp.bill_number,
                created_by: exp.created_by,
                created_at: new Date()
              }));

              await db('expenses').insert(newExpenses);
              console.log(`Auto-cloned ${newExpenses.length} expenses for hostel ${hostel_id} from ${prevMonthStr} to ${currentMonthStr}`);
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


    // If user is hostel owner, filter by their hostel from JWT
    if ((user?.role_id === 2 || (user?.role_id === 1 && user?.hostel_id))) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('e.hostel_id', user.hostel_id);
    }

    // Apply filters
    if (hostelId) {
      query = query.where('e.hostel_id', hostelId);
    }

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

    const resolvedHostelId = hostel_id || user?.hostel_id;
    if (resolvedHostelId) {
      const allTimeResult = await db('expenses')
        .where('hostel_id', resolvedHostelId)
        .sum('amount as total')
        .first();
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
      const monthResult = await db('expenses')
        .where('hostel_id', resolvedHostelId)
        .whereBetween('expense_date', [mStart, mEnd])
        .sum('amount as total')
        .first();
      monthExpensesTotal = parseFloat(monthResult?.total || 0);

      // ── Fold staff wage payments into the totals so they reconcile with Overview ──
      try {
        const allWages = await db('staff_payments')
          .where('hostel_id', resolvedHostelId)
          .sum('amount as total')
          .first();
        totalExpenses += parseFloat(allWages?.total || 0);

        const monthWages = await db('staff_payments')
          .where('hostel_id', resolvedHostelId)
          .whereBetween('payment_date', [mStart, mEnd])
          .sum('amount as total')
          .first();
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
    if (isFirstPage && !categoryId && resolvedHostelId) {
      try {
        let wq = db('staff_payments as sp')
          .leftJoin('staff as st', 'sp.staff_id', 'st.staff_id')
          .where('sp.hostel_id', resolvedHostelId)
          .select('sp.payment_id', 'sp.amount', 'sp.payment_date', 'sp.note', 'st.full_name');
        if (startDate && endDate) wq = wq.whereBetween('sp.payment_date', [startDate, endDate]);
        if (search) {
          const term = `%${search}%`;
          wq = wq.where(function () { this.where('st.full_name', 'like', term).orWhere('sp.note', 'like', term); });
        }
        const wages = await wq.orderBy('sp.payment_date', 'desc');
        wageRows = wages.map((w: any) => ({
          expense_id: `wage_${w.payment_id}`,
          hostel_id: resolvedHostelId,
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

    if (req.user?.hostel_id && expense.hostel_id !== req.user.hostel_id) {
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

    // Determine hostel_id based on user role
    let hostel_id: number;

    if ((user?.role_id === 2 || (user?.role_id === 1 && user?.hostel_id))) {
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

    // If user is hostel owner, ensure they can only update their own hostel's expense
    if ((user?.role_id === 2 || (user?.role_id === 1 && user?.hostel_id))) {
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

    // If user is hostel owner, ensure they can only delete their own hostel's expense
    if ((user?.role_id === 2 || (user?.role_id === 1 && user?.hostel_id))) {
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

    // If user is hostel owner, filter by their hostel from JWT
    if ((user?.role_id === 2 || (user?.role_id === 1 && user?.hostel_id))) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('e.hostel_id', user.hostel_id);
    }

    if (hostelId) {
      query = query.where('e.hostel_id', hostelId);
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
