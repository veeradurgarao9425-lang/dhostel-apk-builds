// @ts-nocheck
import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// Get dashboard statistics for owner
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    // Determine hostel filtering based on user role
    let hostelIds: number[] = [];

    if (user?.role_id === 2) {
      // Hostel owner - use hostel from JWT token
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostelIds = [user.hostel_id];
    }
    // For admin (role_id === 1), hostelIds remains empty = all hostels

    // Get total rooms
    let roomsQuery = db('rooms').count('* as count');
    if (hostelIds.length > 0) {
      roomsQuery = roomsQuery.whereIn('hostel_id', hostelIds);
    }
    const totalRooms = await roomsQuery.first();

    // Get total students (active)
    let studentsQuery = db('students')
      .where('status', 1)
      .count('* as count');
    if (hostelIds.length > 0) {
      studentsQuery = studentsQuery.whereIn('hostel_id', hostelIds);
    }
    const totalStudents = await studentsQuery.first();

    // Get total beds - Prioritize r.capacity column if it exists, otherwise use room_type parsing
    let totalBedsQuery = db('rooms as r')
      .leftJoin('room_types as rt', 'r.room_type_id', 'rt.room_type_id')
      .select(db.raw(`
        SUM(
          COALESCE(
            NULLIF(r.capacity, 0),
            CASE 
              WHEN rt.room_type_name REGEXP '^[0-9]+$' THEN CAST(rt.room_type_name AS UNSIGNED)
              WHEN LOWER(rt.room_type_name) LIKE '%single%' THEN 1
              WHEN LOWER(rt.room_type_name) LIKE '%double%' THEN 2
              WHEN LOWER(rt.room_type_name) LIKE '%triple%' THEN 3
              WHEN LOWER(rt.room_type_name) LIKE '%four%' OR LOWER(rt.room_type_name) LIKE '%4%' THEN 4
              WHEN LOWER(rt.room_type_name) LIKE '%five%' OR LOWER(rt.room_type_name) LIKE '%5%' THEN 5
              WHEN LOWER(rt.room_type_name) LIKE '%six%' OR LOWER(rt.room_type_name) LIKE '%6%' THEN 6
              WHEN LOWER(rt.room_type_name) LIKE '%seven%' OR LOWER(rt.room_type_name) LIKE '%7%' THEN 7
              WHEN LOWER(rt.room_type_name) LIKE '%eight%' OR LOWER(rt.room_type_name) LIKE '%8%' THEN 8
              WHEN LOWER(rt.room_type_name) LIKE '%dormitory%' THEN 10
              ELSE 0
            END,
            1 -- Default to 1 if everything else fails
          )
        ) as total_beds
      `));
    if (hostelIds.length > 0) {
      totalBedsQuery = totalBedsQuery.whereIn('r.hostel_id', hostelIds);
    }
    const bedsData = await totalBedsQuery.first();

    // Get occupied beds - count active students with room_id (room_allocations table was removed)
    let occupiedBedsQuery = db('students')
      .where('status', 1)
      .whereNotNull('room_id')
      .count('* as count');
    if (hostelIds.length > 0) {
      occupiedBedsQuery = occupiedBedsQuery.whereIn('hostel_id', hostelIds);
    }
    const occupiedData = await occupiedBedsQuery.first();
    const occupiedBeds = occupiedData?.count || 0;

    // Calculate occupancy rate
    const totalBeds = bedsData?.total_beds || 0;
    const occupancyRate = totalBeds > 0
      ? ((Number(occupiedBeds) / Number(totalBeds)) * 100).toFixed(2)
      : 0;

    // Get current month start and end dates (use date strings to avoid timezone issues)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Get monthly income from income table only (matches Income page)
    let incomeQuery = db('income')
      .whereBetween('income_date', [monthStart, monthEnd])
      .sum('amount as total');
    if (hostelIds.length > 0) {
      incomeQuery = incomeQuery.whereIn('hostel_id', hostelIds);
    }
    const monthlyIncome = await incomeQuery.first();

    const totalMonthlyIncome = Number(monthlyIncome?.total || 0);

    // Get fee collection for current month (from fee_payments table)
    let feeCollectionQuery = db('fee_payments')
      .whereBetween('payment_date', [monthStart, monthEnd])
      .sum('amount as total')
      .count('* as count');
    if (hostelIds.length > 0) {
      feeCollectionQuery = feeCollectionQuery.whereIn('hostel_id', hostelIds);
    }
    const feeCollection = await feeCollectionQuery.first();

    // Get monthly expenses
    let expensesQuery = db('expenses')
      .whereBetween('expense_date', [monthStart, monthEnd])
      .sum('amount as total');
    if (hostelIds.length > 0) {
      expensesQuery = expensesQuery.whereIn('hostel_id', hostelIds);
    }
    const monthlyExpenses = await expensesQuery.first();

    // Calculate net profit
    const income = Number(totalMonthlyIncome);
    const expenses = Number(monthlyExpenses?.total || 0);
    const netProfit = income - expenses;

    // Monthly rent due and pending for current month from monthly_fees
    let monthlyFeesDueQuery = db('monthly_fees')
      .where('fee_month', `${year}-${String(month).padStart(2, '0')}`)
      .sum('total_due as total_due')
      .sum('balance as total_pending');
    if (hostelIds.length > 0) {
      monthlyFeesDueQuery = monthlyFeesDueQuery.whereIn('hostel_id', hostelIds);
    }
    const monthlyFeesDue = await monthlyFeesDueQuery.first();
    const monthlyRentDue = Number(monthlyFeesDue?.total_due || 0);
    const monthlyRentPending = Number(monthlyFeesDue?.total_pending || 0);
    const monthlyRentCollected = Number(feeCollection?.total || 0);

    // Get pending dues count - count unpaid monthly fees
    let pendingDuesQuery = db('monthly_fees')
      .whereIn('fee_status', ['Pending', 'Partially Paid', 'Overdue'])
      .count('* as count')
      .sum('balance as total');
    if (hostelIds.length > 0) {
      pendingDuesQuery = pendingDuesQuery.whereIn('hostel_id', hostelIds);
    }
    const pendingDues = await pendingDuesQuery.first();

    // Get left tenants (inactive students) count
    let leftTenantsQuery = db('students')
      .where('status', 0)
      .count('* as count');
    if (hostelIds.length > 0) {
      leftTenantsQuery = leftTenantsQuery.whereIn('hostel_id', hostelIds);
    }
    const leftTenantsData = await leftTenantsQuery.first();
    const leftTenants = leftTenantsData?.count || 0;

    // Get pre-booking count (status = 2)
    let prebookingQuery = db('students')
      .where('status', 2)
      .count('* as count');
    if (hostelIds.length > 0) {
      prebookingQuery = prebookingQuery.whereIn('hostel_id', hostelIds);
    }
    const prebookingData = await prebookingQuery.first();
    const prebookingsCount = prebookingData?.count || 0;

    // Get vacate notices count (active students with a scheduled vacate date)
    let noticesCountQuery = db('students')
      .where('status', 1)
      .whereNotNull('vacate_notice_date')
      .count('* as count');
    if (hostelIds.length > 0) {
      noticesCountQuery = noticesCountQuery.whereIn('hostel_id', hostelIds);
    }
    const noticesCountData = await noticesCountQuery.first();
    const noticesCount = noticesCountData?.count || 0;

    // Get active staff count
    let staffQuery = db('staff')
      .where('status', 'ACTIVE')
      .count('* as count');
    if (hostelIds.length > 0) {
      staffQuery = staffQuery.whereIn('hostel_id', hostelIds);
    }
    const staffData = await staffQuery.first();
    const staffCount = Number(staffData?.count || 0);

    // Get today's rent collection (from fee_payments table)
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let todayRentQuery = db('fee_payments')
      .where('payment_date', today)
      .sum('amount as total')
      .count('* as count');
    if (hostelIds.length > 0) {
      todayRentQuery = todayRentQuery.whereIn('hostel_id', hostelIds);
    }
    const todayRent = await todayRentQuery.first();

    // Get today's split by payment mode
    let todaySplitQuery = db('fee_payments as fp')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .where('fp.payment_date', today)
      .select('pm.payment_mode_name as mode', db.raw('SUM(fp.amount) as total'))
      .groupBy('pm.payment_mode_name');
    if (hostelIds.length > 0) {
      todaySplitQuery = todaySplitQuery.whereIn('fp.hostel_id', hostelIds);
    }
    const todaySplit = await todaySplitQuery;

    console.log('[DEBUG] Dashboard Stats Request for user:', user?.user_id, 'Role:', user?.role_id);
    console.log('[DEBUG] totalRooms:', totalRooms?.count);
    console.log('[DEBUG] totalStudents:', totalStudents?.count);
    // Get new admissions count this month (using admission_date)
    let newAdmissionsQuery = db('students')
      .where('status', 1)
      .whereBetween('admission_date', [monthStart, monthEnd])
      .count('* as count');
    if (hostelIds.length > 0) {
      newAdmissionsQuery = newAdmissionsQuery.whereIn('hostel_id', hostelIds);
    }
    const newAdmissionsData = await newAdmissionsQuery.first();
    const newAdmissionsCount = Number(newAdmissionsData?.count || 0);

    console.log('[DEBUG] totalBedsRaw:', bedsData?.total_beds);
    console.log('[DEBUG] occupiedBeds:', occupiedBeds);
    console.log('[DEBUG] prebookingsCount:', prebookingsCount);
    console.log('[DEBUG] noticesCount:', noticesCount);
    console.log('[DEBUG] todayRent:', todayRent?.total);
    console.log('[DEBUG] staffCount:', staffCount);
    console.log('[DEBUG] newAdmissionsCount:', newAdmissionsCount);

    res.json({
      success: true,
      data: {
        totalRooms: Number(totalRooms?.count || 0),
        totalStudents: Number(totalStudents?.count || 0),
        occupancyRate: Number(occupancyRate),
        totalBeds: Number(totalBeds),
        occupiedBeds: Number(occupiedBeds),
        staffCount,
        monthlyIncome: Number(income),
        monthlyExpenses: Number(expenses),
        netProfit: Number(netProfit),
        feeCollection: Number(feeCollection?.total || 0),
        feeCollectionCount: Number(feeCollection?.count || 0),
        pendingDuesCount: Number(pendingDues?.count || 0),
        pendingDuesAmount: Number(pendingDues?.total || 0),
        leftTenants: Number(leftTenants),
        prebookingsCount: Number(prebookingsCount),
        noticesCount: Number(noticesCount),
        monthlyRentDue,
        monthlyRentPending,
        monthlyRentCollected,
        todayRent: Number(todayRent?.total || 0),
        todayCount: Number(todayRent?.count || 0),
        todaySplit: todaySplit.map(s => ({ mode: s.mode, total: Number(s.total) })),
        newAdmissionsCount
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
};

// Get monthly income report
export const getIncomeReport = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, startDate, endDate, year, month } = req.query;
    const user = req.user;

    let query = db('fee_payments as fp')
      .leftJoin('students as s', 'fp.student_id', 's.student_id')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .select(
        db.raw('DATE_FORMAT(fp.payment_date, "%Y-%m") as month'),
        'pm.payment_mode_name',
        db.raw('SUM(fp.amount) as total_amount'),
        db.raw('COUNT(*) as payment_count')
      )
      .groupBy('month', 'pm.payment_mode_name')
      .orderBy('month', 'desc');

    // Owner filtering - use JWT hostel_id
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('fp.hostel_id', user.hostel_id);
    }

    // Apply filters
    if (hostelId && user?.role_id !== 2) {
      query = query.where('fp.hostel_id', hostelId);
    }

    if (startDate && endDate) {
      query = query.whereBetween('fp.payment_date', [startDate, endDate]);
    } else if (year && month) {
      const monthStart = new Date(Number(year), Number(month) - 1, 1);
      const monthEnd = new Date(Number(year), Number(month), 0);
      query = query.whereBetween('fp.payment_date', [monthStart, monthEnd]);
    }

    const incomeData = await query;

    // Calculate total
    const total = incomeData.reduce((sum, item) => sum + Number(item.total_amount), 0);

    res.json({
      success: true,
      data: {
        income: incomeData,
        total: Number(total)
      }
    });
  } catch (error) {
    console.error('Get income report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch income report'
    });
  }
};

// Get monthly expense report
export const getExpenseReport = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, startDate, endDate, year, month } = req.query;
    const user = req.user;

    let query = db('expenses as e')
      .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .select(
        db.raw('DATE_FORMAT(e.expense_date, "%Y-%m") as month'),
        'ec.category_name',
        db.raw('SUM(e.amount) as total_amount'),
        db.raw('COUNT(*) as expense_count')
      )
      .groupBy('month', 'ec.category_name')
      .orderBy('month', 'desc');

    // Owner filtering - use JWT hostel_id
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('e.hostel_id', user.hostel_id);
    }

    // Apply filters
    if (hostelId && user?.role_id !== 2) {
      query = query.where('e.hostel_id', hostelId);
    }

    if (startDate && endDate) {
      query = query.whereBetween('e.expense_date', [startDate, endDate]);
    } else if (year && month) {
      const monthStart = new Date(Number(year), Number(month) - 1, 1);
      const monthEnd = new Date(Number(year), Number(month), 0);
      query = query.whereBetween('e.expense_date', [monthStart, monthEnd]);
    }

    const expenseData = await query;

    // Calculate total
    const total = expenseData.reduce((sum, item) => sum + Number(item.total_amount), 0);

    res.json({
      success: true,
      data: {
        expenses: expenseData,
        total: Number(total)
      }
    });
  } catch (error) {
    console.error('Get expense report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expense report'
    });
  }
};

// Get Profit & Loss statement
export const getProfitLoss = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, startDate, endDate, year } = req.query;
    const user = req.user;

    // Determine date range
    let dateStart: Date;
    let dateEnd: Date;

    if (startDate && endDate) {
      dateStart = new Date(startDate as string);
      dateEnd = new Date(endDate as string);
    } else if (year) {
      dateStart = new Date(Number(year), 0, 1);
      dateEnd = new Date(Number(year), 11, 31);
    } else {
      // Default to current year
      const currentYear = new Date().getFullYear();
      dateStart = new Date(currentYear, 0, 1);
      dateEnd = new Date(currentYear, 11, 31);
    }

    // Get hostel IDs for owner
    let hostelIds: number[] = [];
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostelIds = [user.hostel_id];
    }

    // Get income by month
    let incomeQuery = db('fee_payments')
      .whereBetween('payment_date', [dateStart, dateEnd])
      .select(
        db.raw('DATE_FORMAT(payment_date, "%Y-%m") as month'),
        db.raw('SUM(amount) as total')
      )
      .groupBy('month')
      .orderBy('month');

    if (hostelId && user?.role_id !== 2) {
      incomeQuery = incomeQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      incomeQuery = incomeQuery.whereIn('hostel_id', hostelIds);
    }

    const incomeByMonth = await incomeQuery;

    // Get expenses by month
    let expensesQuery = db('expenses')
      .whereBetween('expense_date', [dateStart, dateEnd])
      .select(
        db.raw('DATE_FORMAT(expense_date, "%Y-%m") as month'),
        db.raw('SUM(amount) as total')
      )
      .groupBy('month')
      .orderBy('month');

    if (hostelId && user?.role_id !== 2) {
      expensesQuery = expensesQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      expensesQuery = expensesQuery.whereIn('hostel_id', hostelIds);
    }

    const expensesByMonth = await expensesQuery;

    // Merge income and expenses by month
    const monthsMap = new Map();

    incomeByMonth.forEach(item => {
      monthsMap.set(item.month, {
        month: item.month,
        income: Number(item.total),
        expenses: 0,
        profit: 0
      });
    });

    expensesByMonth.forEach(item => {
      const existing = monthsMap.get(item.month);
      if (existing) {
        existing.expenses = Number(item.total);
      } else {
        monthsMap.set(item.month, {
          month: item.month,
          income: 0,
          expenses: Number(item.total),
          profit: 0
        });
      }
    });

    // Calculate profit for each month
    const monthlyData = Array.from(monthsMap.values()).map(item => ({
      ...item,
      profit: item.income - item.expenses
    }));

    // Calculate totals
    const totalIncome = monthlyData.reduce((sum, item) => sum + item.income, 0);
    const totalExpenses = monthlyData.reduce((sum, item) => sum + item.expenses, 0);
    const totalProfit = totalIncome - totalExpenses;

    res.json({
      success: true,
      data: {
        monthlyData,
        summary: {
          totalIncome: Number(totalIncome),
          totalExpenses: Number(totalExpenses),
          totalProfit: Number(totalProfit),
          profitMargin: totalIncome > 0 ? ((totalProfit / totalIncome) * 100).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    console.error('Get P&L error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profit & loss statement'
    });
  }
};

// Get occupancy trends
export const getOccupancyTrends = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.query;
    const user = req.user;

    // Get hostel IDs for owner
    let hostelIds: number[] = [];
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostelIds = [user.hostel_id];
    }

    // Get current occupancy by hostel
    let query = db('hostel_master as h')
      .leftJoin('rooms as r', 'h.hostel_id', 'r.hostel_id')
      .leftJoin('room_types as rt', 'r.room_type_id', 'rt.room_type_id')
      .select(
        'h.hostel_id',
        'h.hostel_name',
        db.raw(`
          COALESCE(SUM(
            CASE 
              WHEN rt.room_type_name REGEXP '^[0-9]+$' THEN CAST(rt.room_type_name AS UNSIGNED)
              WHEN LOWER(rt.room_type_name) LIKE '%single%' THEN 1
              WHEN LOWER(rt.room_type_name) LIKE '%double%' THEN 2
              WHEN LOWER(rt.room_type_name) LIKE '%triple%' THEN 3
              WHEN LOWER(rt.room_type_name) LIKE '%four%' OR LOWER(rt.room_type_name) LIKE '%4%' THEN 4
              WHEN LOWER(rt.room_type_name) LIKE '%five%' OR LOWER(rt.room_type_name) LIKE '%5%' THEN 5
              WHEN LOWER(rt.room_type_name) LIKE '%six%' OR LOWER(rt.room_type_name) LIKE '%6%' THEN 6
              WHEN LOWER(rt.room_type_name) LIKE '%dormitory%' THEN 10
              ELSE COALESCE(r.room_type_id, 0)
            END
          ), 0) as total_beds
        `),
        db.raw('COALESCE(SUM(r.occupied_beds), 0) as occupied_beds')
      )
      .groupBy('h.hostel_id', 'h.hostel_name');

    if (hostelId && user?.role_id !== 2) {
      query = query.where('h.hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      query = query.whereIn('h.hostel_id', hostelIds);
    }

    const occupancyData = await query;

    // Calculate occupancy rate for each hostel
    const trendsData = occupancyData.map(item => ({
      hostel_id: item.hostel_id,
      hostel_name: item.hostel_name,
      total_beds: Number(item.total_beds),
      occupied_beds: Number(item.occupied_beds),
      available_beds: Number(item.total_beds) - Number(item.occupied_beds),
      occupancy_rate: item.total_beds > 0
        ? ((item.occupied_beds / item.total_beds) * 100).toFixed(2)
        : 0
    }));

    res.json({
      success: true,
      data: trendsData
    });
  } catch (error) {
    console.error('Get occupancy trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch occupancy trends'
    });
  }
};

// Get payment collection report
export const getPaymentCollectionReport = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, startDate, endDate } = req.query;
    const user = req.user;

    // Get hostel IDs for owner
    let hostelIds: number[] = [];
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostelIds = [user.hostel_id];
    }

    // Determine date range
    let dateStart: Date;
    let dateEnd: Date;

    if (startDate && endDate) {
      dateStart = new Date(startDate as string);
      dateEnd = new Date(endDate as string);
    } else {
      // Default to current month
      const now = new Date();
      dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Get total collected
    let collectedQuery = db('fee_payments')
      .whereBetween('payment_date', [dateStart, dateEnd])
      .sum('amount as total')
      .count('* as count');

    if (hostelId && user?.role_id !== 2) {
      collectedQuery = collectedQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      collectedQuery = collectedQuery.whereIn('hostel_id', hostelIds);
    }

    const collected = await collectedQuery.first();

    // Get pending dues from monthly_fees
    let pendingQuery = db('monthly_fees')
      .whereIn('fee_status', ['Pending', 'Partially Paid', 'Overdue'])
      .sum('balance as total')
      .count('* as count');

    if (hostelId && user?.role_id !== 2) {
      pendingQuery = pendingQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      pendingQuery = pendingQuery.whereIn('hostel_id', hostelIds);
    }

    const pending = await pendingQuery.first();

    // Get collection by payment mode
    let modeQuery = db('fee_payments as fp')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .whereBetween('fp.payment_date', [dateStart, dateEnd])
      .select(
        'pm.payment_mode_name',
        db.raw('SUM(fp.amount) as total'),
        db.raw('COUNT(*) as count')
      )
      .groupBy('pm.payment_mode_name');

    if (hostelId && user?.role_id !== 2) {
      modeQuery = modeQuery.where('fp.hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      modeQuery = modeQuery.whereIn('fp.hostel_id', hostelIds);
    }

    const collectionByMode = await modeQuery;

    res.json({
      success: true,
      data: {
        collected: {
          total: Number(collected?.total || 0),
          count: collected?.count || 0
        },
        pending: {
          total: Number(pending?.total || 0),
          count: pending?.count || 0
        },
        collectionByMode: collectionByMode.map(item => ({
          mode: item.payment_mode_name,
          total: Number(item.total),
          count: item.count
        })),
        collectionRate: (collected?.total && pending?.total)
          ? ((collected.total / (collected.total + pending.total)) * 100).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    console.error('Get payment collection report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment collection report'
    });
  }
};

// Get owner stats for profile screen
export const getOwnerStats = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    let hostelIds: number[] = [];

    if (user?.role_id === 2) {
      // Find all active hostels owned by this user
      const userHostels = await db('hostel_master')
        .select('hostel_id')
        .where({ owner_id: user.user_id, is_active: 1 });
      hostelIds = userHostels.map(h => h.hostel_id);
    }

    const hostelsCount = hostelIds.length;

    // 1. Get occupied beds
    let occupiedBeds = 0;
    if (user?.role_id !== 2 || hostelIds.length > 0) {
      let occupiedBedsQuery = db('students')
        .where('status', 1)
        .whereNotNull('room_id')
        .count('* as count');
      if (user?.role_id === 2) {
        occupiedBedsQuery = occupiedBedsQuery.whereIn('hostel_id', hostelIds);
      }
      const occupiedData = await occupiedBedsQuery.first();
      occupiedBeds = Number(occupiedData?.count || 0);
    }

    // 2. Get total beds
    let totalBeds = 0;
    if (user?.role_id !== 2 || hostelIds.length > 0) {
      let totalBedsQuery = db('rooms as r')
        .leftJoin('room_types as rt', 'r.room_type_id', 'rt.room_type_id')
        .select(db.raw(`
          SUM(
            COALESCE(
              NULLIF(r.capacity, 0),
              CASE 
                WHEN rt.room_type_name REGEXP '^[0-9]+$' THEN CAST(rt.room_type_name AS UNSIGNED)
                WHEN LOWER(rt.room_type_name) LIKE '%single%' THEN 1
                WHEN LOWER(rt.room_type_name) LIKE '%double%' THEN 2
                WHEN LOWER(rt.room_type_name) LIKE '%triple%' THEN 3
                WHEN LOWER(rt.room_type_name) LIKE '%four%' OR LOWER(rt.room_type_name) LIKE '%4%' THEN 4
                WHEN LOWER(rt.room_type_name) LIKE '%five%' OR LOWER(rt.room_type_name) LIKE '%5%' THEN 5
                WHEN LOWER(rt.room_type_name) LIKE '%six%' OR LOWER(rt.room_type_name) LIKE '%6%' THEN 6
                WHEN LOWER(rt.room_type_name) LIKE '%seven%' OR LOWER(rt.room_type_name) LIKE '%7%' THEN 7
                WHEN LOWER(rt.room_type_name) LIKE '%eight%' OR LOWER(rt.room_type_name) LIKE '%8%' THEN 8
                WHEN LOWER(rt.room_type_name) LIKE '%dormitory%' THEN 10
                ELSE 0
              END,
              1
            )
          ) as total_beds
        `));
      if (user?.role_id === 2) {
        totalBedsQuery = totalBedsQuery.whereIn('r.hostel_id', hostelIds);
      }
      const bedsData = await totalBedsQuery.first();
      totalBeds = Number(bedsData?.total_beds || 0);
    }

    // 3. Get today's collected rent/fees
    let todayCollected = 0;
    if (user?.role_id !== 2 || hostelIds.length > 0) {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      let todayRentQuery = db('fee_payments')
        .where('payment_date', today)
        .sum('amount as total');
      if (user?.role_id === 2) {
        todayRentQuery = todayRentQuery.whereIn('hostel_id', hostelIds);
      }
      const todayRent = await todayRentQuery.first();
      todayCollected = Number(todayRent?.total || 0);
    }

    // 4. Rooms count
    let roomsCount = 0;
    if (user?.role_id !== 2 || hostelIds.length > 0) {
      let roomsCountQuery = db('rooms').count('* as count');
      if (user?.role_id === 2) {
        roomsCountQuery = roomsCountQuery.whereIn('hostel_id', hostelIds);
      }
      const roomsCountData = await roomsCountQuery.first();
      roomsCount = Number(roomsCountData?.count || 0);
    }

    // 5. Tenants count
    let tenantsCount = 0;
    if (user?.role_id !== 2 || hostelIds.length > 0) {
      let tenantsCountQuery = db('students').where('status', 1).count('* as count');
      if (user?.role_id === 2) {
        tenantsCountQuery = tenantsCountQuery.whereIn('hostel_id', hostelIds);
      }
      const tenantsCountData = await tenantsCountQuery.first();
      tenantsCount = Number(tenantsCountData?.count || 0);
    }

    res.json({
      success: true,
      data: {
        hostelsCount,
        roomsCount,
        tenantsCount,
        rooms: {
          occupied_beds: occupiedBeds,
          total_beds: totalBeds
        },
        fees: {
          today_collected: todayCollected
        }
      }
    });
  } catch (error) {
    console.error('Get owner stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch owner statistics'
    });
  }
};

// Get monthly financial overview (P&L dashboard)
export const getMonthlyOverview = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { month } = req.query; // Expected format: YYYY-MM

    // Determine hostel filtering
    let hostelIds: number[] = [];
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostelIds = [user.hostel_id];
    }

    // Parse the requested month or default to current
    const now = new Date();
    let targetYear: number, targetMonth: number;

    if (month && typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
      const parts = month.split('-').map(Number);
      targetYear = parts[0];
      targetMonth = parts[1];
    } else {
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    }

    const monthStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    const monthEnd = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const feeMonthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

    // ── 1. Fee Collection for the month (from fee_payments) ──
    let feeQuery = db('fee_payments')
      .whereBetween('payment_date', [monthStart, monthEnd])
      .sum('amount as total')
      .count('* as count');
    if (hostelIds.length > 0) {
      feeQuery = feeQuery.whereIn('hostel_id', hostelIds);
    }
    const feeResult = await feeQuery.first();
    const feeCollection = Number(feeResult?.total || 0);
    const feeCount = Number(feeResult?.count || 0);

    // ── 2. Other Income (from income table) ──
    let incomeQuery = db('income')
      .whereBetween('income_date', [monthStart, monthEnd])
      .sum('amount as total')
      .count('* as count');
    if (hostelIds.length > 0) {
      incomeQuery = incomeQuery.whereIn('hostel_id', hostelIds);
    }
    const incomeResult = await incomeQuery.first();
    const otherIncome = Number(incomeResult?.total || 0);

    const totalIncome = feeCollection + otherIncome;

    // ── 3. Expenses by category for the month ──
    let expenseCatQuery = db('expenses as e')
      .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .whereBetween('e.expense_date', [monthStart, monthEnd])
      .select(
        'ec.category_id',
        'ec.category_name',
        db.raw('SUM(e.amount) as total_amount'),
        db.raw('COUNT(e.expense_id) as count')
      )
      .groupBy('ec.category_id', 'ec.category_name')
      .orderBy('total_amount', 'desc');
    if (hostelIds.length > 0) {
      expenseCatQuery = expenseCatQuery.whereIn('e.hostel_id', hostelIds);
    }
    const expenseBreakdown = await expenseCatQuery;

    const totalExpenses = expenseBreakdown.reduce(
      (sum: number, item: any) => sum + Number(item.total_amount || 0), 0
    );

    // Calculate percentages for each category
    const expenseCategories = expenseBreakdown.map((item: any) => ({
      category_id: item.category_id,
      category_name: item.category_name || 'Uncategorized',
      amount: Number(item.total_amount || 0),
      count: Number(item.count || 0),
      percentage: totalExpenses > 0
        ? Number(((Number(item.total_amount) / totalExpenses) * 100).toFixed(1))
        : 0
    }));

    const netProfit = totalIncome - totalExpenses;

    // ── 4. Monthly rent due/collected/pending for context ──
    let monthlyFeeQuery = db('monthly_fees')
      .where('fee_month', feeMonthStr)
      .sum('total_due as total_due')
      .sum('balance as total_pending');
    if (hostelIds.length > 0) {
      monthlyFeeQuery = monthlyFeeQuery.whereIn('hostel_id', hostelIds);
    }
    const monthlyFeeResult = await monthlyFeeQuery.first();
    const totalRentDue = Number(monthlyFeeResult?.total_due || 0);
    const totalRentPending = Number(monthlyFeeResult?.total_pending || 0);

    // ── 5. 12-month trend (last 12 months including current) ──
    const trend: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const tDate = new Date(targetYear, targetMonth - 1 - i, 1);
      const tYear = tDate.getFullYear();
      const tMonth = tDate.getMonth() + 1;
      const tMonthStr = `${tYear}-${String(tMonth).padStart(2, '0')}`;
      const tStart = `${tMonthStr}-01`;
      const tLastDay = new Date(tYear, tMonth, 0).getDate();
      const tEnd = `${tMonthStr}-${String(tLastDay).padStart(2, '0')}`;

      // Fee collection
      let tFeeQ = db('fee_payments')
        .whereBetween('payment_date', [tStart, tEnd])
        .sum('amount as total');
      if (hostelIds.length > 0) tFeeQ = tFeeQ.whereIn('hostel_id', hostelIds);
      const tFee = await tFeeQ.first();

      // Other income
      let tIncQ = db('income')
        .whereBetween('income_date', [tStart, tEnd])
        .sum('amount as total');
      if (hostelIds.length > 0) tIncQ = tIncQ.whereIn('hostel_id', hostelIds);
      const tInc = await tIncQ.first();

      // Expenses
      let tExpQ = db('expenses')
        .whereBetween('expense_date', [tStart, tEnd])
        .sum('amount as total');
      if (hostelIds.length > 0) tExpQ = tExpQ.whereIn('hostel_id', hostelIds);
      const tExp = await tExpQ.first();

      const tIncome = Number(tFee?.total || 0) + Number(tInc?.total || 0);
      const tExpenses = Number(tExp?.total || 0);

      trend.push({
        month: tMonthStr,
        monthLabel: new Date(tYear, tMonth - 1).toLocaleString('en-US', { month: 'short' }),
        year: tYear,
        income: tIncome,
        feeCollection: Number(tFee?.total || 0),
        otherIncome: Number(tInc?.total || 0),
        expenses: tExpenses,
        profit: tIncome - tExpenses
      });
    }

    res.json({
      success: true,
      data: {
        currentMonth: {
          month: feeMonthStr,
          monthLabel: new Date(targetYear, targetMonth - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          feeCollection,
          feeCount,
          otherIncome,
          totalIncome,
          totalExpenses,
          netProfit,
          profitMargin: totalIncome > 0 ? Number(((netProfit / totalIncome) * 100).toFixed(1)) : 0,
          expenseBreakdown: expenseCategories,
          rentDue: totalRentDue,
          rentPending: totalRentPending,
          rentCollected: feeCollection
        },
        trend
      }
    });
  } catch (error) {
    console.error('Get monthly overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly overview'
    });
  }
};
