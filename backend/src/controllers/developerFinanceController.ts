/**
 * developerFinanceController
 *
 * The developer's own P&L for running the platform — deliberately NOT an
 * accounting engine. It answers exactly the questions a single operator running
 * 5-30 hostels asks: what should I receive, what did I receive, what's pending,
 * who is due next, what did I spend, what's left.
 *
 * Vocabulary (kept strictly separate — never mixed in one number):
 *   EXPECTED  SUM(hostel_billing.agreed_amount) over ACTIVE billings — one
 *             billing cycle's worth of revenue.
 *   RECEIVED  SUM(hostel_billing_payments.amount) — money actually banked.
 *   PENDING   agreed_amount of every ACTIVE hostel whose current instalment is
 *             not settled, i.e. next_due_date IS NULL or <= today. Recording a
 *             payment rolls next_due_date forward by the billing frequency,
 *             which is what moves a hostel out of PENDING.
 *   EXPENSES  SUM(platform_expenses.amount) — the developer's infra costs only.
 *             Hostel-owner expenses live in `expenses` and are never counted.
 *   NET       RECEIVED - EXPENSES.
 */
import { Response } from 'express';
import db from '../config/database.js';
import { DeveloperAuthRequest, logDeveloperAction } from '../middleware/developerAuth.js';
import { notifyDeveloper } from '../services/developerNotificationService.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const FREQUENCY_MONTHS: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  YEARLY: 12,
};

const VALID_FREQUENCIES = Object.keys(FREQUENCY_MONTHS);
const VALID_BILLING_STATUS = ['ACTIVE', 'PAUSED', 'CANCELLED'];

export const EXPENSE_CATEGORIES = [
  'Server',
  'Database',
  'Storage',
  'Email',
  'Domain',
  'Hosting',
  'Marketing',
  'Other',
];

const num = (v: any) => Number(v || 0);

/** YYYY-MM-DD in local time — DATE columns hold plain calendar dates. */
const toDateOnly = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const todayDateOnly = () => toDateOnly(new Date());

const parseDateOnly = (value: any): Date | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Whole days from today to `date` — negative when the date is in the past. */
const daysUntil = (date: Date): number => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
};

const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  const targetDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  // Clamp for short months: 31 Jan + 1 month → 28/29 Feb, not 2/3 Mar.
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(targetDay, lastDay));
  return d;
};

/**
 * Payment state of a hostel's current billing cycle.
 *  NOT_SET  — no agreed amount recorded yet (nothing expected, nothing pending)
 *  PAID     — next_due_date is in the future, so this cycle is settled
 *  DUE_TODAY / OVERDUE / DUE_SOON / UPCOMING — otherwise, keyed off next_due_date
 */
function paymentState(row: {
  agreed_amount?: any;
  status?: string;
  next_due_date?: any;
}): { state: string; days_remaining: number | null; is_pending: boolean } {
  const amount = num(row.agreed_amount);
  if (amount <= 0 || !row.status || row.status === 'CANCELLED') {
    return { state: 'NOT_SET', days_remaining: null, is_pending: false };
  }
  if (row.status === 'PAUSED') {
    return { state: 'PAUSED', days_remaining: null, is_pending: false };
  }

  const due = parseDateOnly(row.next_due_date);
  if (!due) {
    // Amount agreed but no schedule yet — treat as owing now, so it can't hide.
    return { state: 'OVERDUE', days_remaining: null, is_pending: true };
  }

  const days = daysUntil(due);
  if (days < 0) return { state: 'OVERDUE', days_remaining: days, is_pending: true };
  if (days === 0) return { state: 'DUE_TODAY', days_remaining: 0, is_pending: true };
  if (days <= 7) return { state: 'DUE_SOON', days_remaining: days, is_pending: false };
  return { state: 'PAID', days_remaining: days, is_pending: false };
}

/**
 * Every hostel with its billing row, lifetime received total and live tenant
 * count, in one pass. Shared by the billing list, the overview and the dues
 * view so all three can never disagree.
 */
async function loadBillingRows(filters: { search?: string; status?: string } = {}) {
  let query = db('hostel_master')
    .leftJoin('users', 'hostel_master.owner_id', 'users.user_id')
    .leftJoin('hostel_billing', 'hostel_master.hostel_id', 'hostel_billing.hostel_id')
    .select(
      'hostel_master.hostel_id',
      'hostel_master.hostel_name',
      'hostel_master.city',
      'hostel_master.is_active',
      'hostel_master.created_at as hostel_created_at',
      'users.user_id as owner_id',
      'users.full_name as owner_name',
      'users.email as owner_email',
      'users.phone as owner_phone',
      'hostel_billing.billing_id',
      'hostel_billing.agreed_amount',
      'hostel_billing.billing_frequency',
      'hostel_billing.status as billing_status',
      'hostel_billing.last_payment_date',
      'hostel_billing.next_due_date',
      'hostel_billing.notes'
    );

  const search = (filters.search || '').trim();
  if (search) {
    query = query.where((b) => {
      b.where('hostel_master.hostel_name', 'like', `%${search}%`)
        .orWhere('hostel_master.city', 'like', `%${search}%`)
        .orWhere('users.full_name', 'like', `%${search}%`)
        .orWhere('users.email', 'like', `%${search}%`)
        .orWhere('users.phone', 'like', `%${search}%`);
    });
  }
  if (filters.status === 'ACTIVE') query = query.where('hostel_master.is_active', 1);
  if (filters.status === 'INACTIVE') query = query.where('hostel_master.is_active', 0);

  const hostels = await query.orderBy('hostel_master.hostel_name', 'asc');
  if (hostels.length === 0) return [];

  const hostelIds = hostels.map((h: any) => h.hostel_id);

  const receivedRows = await db('hostel_billing_payments')
    .whereIn('hostel_id', hostelIds)
    .groupBy('hostel_id')
    .select('hostel_id')
    .sum('amount as received')
    .max('paid_on as latest_paid_on');
  const receivedMap = new Map<number, { received: number; latest_paid_on: any }>(
    receivedRows.map((r: any) => [
      Number(r.hostel_id),
      { received: num(r.received), latest_paid_on: r.latest_paid_on },
    ])
  );

  const studentRows = await db('students')
    .whereIn('hostel_id', hostelIds)
    .where('status', 1)
    .groupBy('hostel_id')
    .select('hostel_id')
    .count('student_id as active_students');
  const studentMap = new Map<number, number>(
    studentRows.map((r: any) => [Number(r.hostel_id), num(r.active_students)])
  );

  return hostels.map((h: any) => {
    const billingStatus = h.billing_id ? h.billing_status : null;
    const agreed = num(h.agreed_amount);
    const state = paymentState({
      agreed_amount: agreed,
      status: billingStatus || (agreed > 0 ? 'ACTIVE' : undefined),
      next_due_date: h.next_due_date,
    });
    const recv = receivedMap.get(Number(h.hostel_id));
    const isBillable = agreed > 0 && billingStatus === 'ACTIVE';

    return {
      hostel_id: Number(h.hostel_id),
      hostel_name: h.hostel_name,
      city: h.city,
      is_active: Number(h.is_active) === 1,
      hostel_created_at: h.hostel_created_at,
      owner_id: h.owner_id ? Number(h.owner_id) : null,
      owner_name: h.owner_name || null,
      owner_email: h.owner_email || null,
      owner_phone: h.owner_phone || null,
      active_students: studentMap.get(Number(h.hostel_id)) || 0,

      billing_id: h.billing_id ? Number(h.billing_id) : null,
      agreed_amount: agreed,
      billing_frequency: h.billing_frequency || 'MONTHLY',
      billing_status: billingStatus,
      last_payment_date: h.last_payment_date || recv?.latest_paid_on || null,
      next_due_date: h.next_due_date || null,
      notes: h.notes || null,

      total_received: recv?.received || 0,
      /** Amount owed for the CURRENT cycle only — 0 once this cycle is settled. */
      pending_amount: isBillable && state.is_pending ? agreed : 0,
      payment_state: isBillable ? state.state : agreed > 0 ? state.state : 'NOT_SET',
      days_remaining: state.days_remaining,
      is_billable: isBillable,
    };
  });
}

export type BillingRow = Awaited<ReturnType<typeof loadBillingRows>>[number];

// ─── Controller ──────────────────────────────────────────────────────────────
export const developerFinanceController = {
  /**
   * Whole-platform financial overview: totals, monthly trend, rankings, dues.
   * Every number here is derived from stored rows — nothing is hard-coded.
   */
  async getOverview(req: DeveloperAuthRequest, res: Response) {
    try {
      const rows = await loadBillingRows();

      const billable = rows.filter((r) => r.is_billable);
      const totalExpected = billable.reduce((a, r) => a + r.agreed_amount, 0);
      const totalPending = billable.reduce((a, r) => a + r.pending_amount, 0);
      const totalReceived = rows.reduce((a, r) => a + r.total_received, 0);

      // Monthly normalisation, so a yearly-billed hostel doesn't distort the
      // monthly run-rate next to a monthly-billed one.
      const monthlyRunRate = billable.reduce(
        (a, r) => a + r.agreed_amount / (FREQUENCY_MONTHS[r.billing_frequency] || 1),
        0
      );

      const expenseTotalRes = await db('platform_expenses').sum('amount as total').first();
      const totalExpenses = num(expenseTotalRes?.total);

      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = toDateOnly(monthStart);

      const receivedThisMonthRes = await db('hostel_billing_payments')
        .where('paid_on', '>=', monthStartStr)
        .sum('amount as total')
        .first();
      const receivedThisMonth = num(receivedThisMonthRes?.total);

      const expensesThisMonthRes = await db('platform_expenses')
        .where('expense_date', '>=', monthStartStr)
        .sum('amount as total')
        .first();
      const expensesThisMonth = num(expensesThisMonthRes?.total);

      // ── 6-month trend (received vs expenses vs net) ──
      const trendStart = addMonths(monthStart, -5);
      const trendStartStr = toDateOnly(trendStart);

      const [paymentSeries, expenseSeries] = await Promise.all([
        db('hostel_billing_payments')
          .where('paid_on', '>=', trendStartStr)
          .select(db.raw("DATE_FORMAT(paid_on, '%Y-%m') as ym"))
          .sum('amount as total')
          .groupByRaw("DATE_FORMAT(paid_on, '%Y-%m')"),
        db('platform_expenses')
          .where('expense_date', '>=', trendStartStr)
          .select(db.raw("DATE_FORMAT(expense_date, '%Y-%m') as ym"))
          .sum('amount as total')
          .groupByRaw("DATE_FORMAT(expense_date, '%Y-%m')"),
      ]);

      const paidByMonth = new Map<string, number>(
        (paymentSeries as any[]).map((r) => [String(r.ym), num(r.total)])
      );
      const spentByMonth = new Map<string, number>(
        (expenseSeries as any[]).map((r) => [String(r.ym), num(r.total)])
      );

      const monthly_trend: Array<{ month: string; ym: string; income: number; expenses: number; net: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const d = addMonths(monthStart, -i);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const income = paidByMonth.get(ym) || 0;
        const expenses = spentByMonth.get(ym) || 0;
        monthly_trend.push({
          month: d.toLocaleString('en-US', { month: 'short' }),
          ym,
          income,
          expenses,
          net: income - expenses,
        });
      }

      // ── Expense split by category (all time + this month) ──
      const expenseByCategory = await db('platform_expenses')
        .select('category')
        .sum('amount as amount')
        .groupBy('category')
        .orderBy('amount', 'desc');

      // ── Rankings — by lifetime received, then by agreed amount ──
      const ranked = [...billable].sort(
        (a, b) => b.total_received - a.total_received || b.agreed_amount - a.agreed_amount
      );
      const revenue_by_hostel = ranked.map((r) => ({
        hostel_id: r.hostel_id,
        hostel_name: r.hostel_name,
        owner_name: r.owner_name,
        agreed_amount: r.agreed_amount,
        total_received: r.total_received,
        pending_amount: r.pending_amount,
        payment_state: r.payment_state,
      }));

      // ── Dues, soonest first; overdue ahead of everything ──
      const dues = billable
        .filter((r) => ['OVERDUE', 'DUE_TODAY', 'DUE_SOON'].includes(r.payment_state))
        .sort((a, b) => (a.days_remaining ?? -9999) - (b.days_remaining ?? -9999))
        .map((r) => ({
          hostel_id: r.hostel_id,
          hostel_name: r.hostel_name,
          owner_name: r.owner_name,
          amount: r.agreed_amount,
          next_due_date: r.next_due_date,
          days_remaining: r.days_remaining,
          payment_state: r.payment_state,
        }));

      const paidCount = billable.filter((r) => r.payment_state === 'PAID').length;
      const overdueCount = billable.filter((r) => r.payment_state === 'OVERDUE').length;
      const dueSoonCount = billable.filter((r) =>
        ['DUE_TODAY', 'DUE_SOON'].includes(r.payment_state)
      ).length;

      return res.json({
        success: true,
        data: {
          summary: {
            total_expected: totalExpected,
            total_received: totalReceived,
            total_pending: totalPending,
            total_expenses: totalExpenses,
            net_balance: totalReceived - totalExpenses,
            monthly_run_rate: Math.round(monthlyRunRate),
            received_this_month: receivedThisMonth,
            expenses_this_month: expensesThisMonth,
            net_this_month: receivedThisMonth - expensesThisMonth,
            collection_rate:
              totalExpected > 0
                ? Math.round(((totalExpected - totalPending) / totalExpected) * 100)
                : 0,
            billable_hostels: billable.length,
            unconfigured_hostels: rows.filter((r) => !r.is_billable).length,
            paid_hostels: paidCount,
            pending_hostels: overdueCount + dueSoonCount,
            overdue_hostels: overdueCount,
            due_soon_hostels: dueSoonCount,
          },
          monthly_trend,
          expense_by_category: (expenseByCategory as any[]).map((r) => ({
            category: r.category,
            amount: num(r.amount),
          })),
          revenue_by_hostel,
          highest_paying: revenue_by_hostel[0] || null,
          lowest_paying:
            revenue_by_hostel.length > 1 ? revenue_by_hostel[revenue_by_hostel.length - 1] : null,
          dues,
        },
      });
    } catch (error: any) {
      console.error('getOverview (finance) error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to build financial overview: ' + error.message,
      });
    }
  },

  /** Per-hostel billing list — the manual management table. */
  async getBilling(req: DeveloperAuthRequest, res: Response) {
    try {
      const rows = await loadBillingRows({
        search: req.query.search as string,
        status: req.query.status as string,
      });

      const paymentStatus = (req.query.payment_status as string || '').toUpperCase();
      const filtered = paymentStatus
        ? rows.filter((r) =>
            paymentStatus === 'PENDING'
              ? ['OVERDUE', 'DUE_TODAY'].includes(r.payment_state)
              : paymentStatus === 'UNCONFIGURED'
              ? !r.is_billable
              : r.payment_state === paymentStatus
          )
        : rows;

      return res.json({
        success: true,
        data: {
          billing: filtered,
          frequencies: VALID_FREQUENCIES,
          total: filtered.length,
        },
      });
    } catch (error: any) {
      console.error('getBilling error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * Create or update one hostel's billing agreement. Upsert on hostel_id so the
   * developer can set an amount for a brand-new hostel in a single tap without
   * a separate "create billing" step.
   */
  async upsertBilling(req: DeveloperAuthRequest, res: Response) {
    try {
      const hostelId = parseInt(req.params.hostelId, 10);
      if (!hostelId) {
        return res.status(400).json({ success: false, error: 'Invalid hostel id' });
      }

      const hostel = await db('hostel_master')
        .where('hostel_id', hostelId)
        .select('hostel_id', 'hostel_name', 'owner_id')
        .first();
      if (!hostel) {
        return res.status(404).json({ success: false, error: 'Hostel not found' });
      }

      const { agreed_amount, billing_frequency, status, next_due_date, notes } = req.body || {};

      const amount = agreed_amount === undefined ? undefined : Number(agreed_amount);
      if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
        return res
          .status(400)
          .json({ success: false, error: 'agreed_amount must be a number >= 0' });
      }
      if (billing_frequency && !VALID_FREQUENCIES.includes(billing_frequency)) {
        return res.status(400).json({
          success: false,
          error: `billing_frequency must be one of ${VALID_FREQUENCIES.join(', ')}`,
        });
      }
      if (status && !VALID_BILLING_STATUS.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `status must be one of ${VALID_BILLING_STATUS.join(', ')}`,
        });
      }
      if (next_due_date && !parseDateOnly(next_due_date)) {
        return res.status(400).json({ success: false, error: 'next_due_date is not a valid date' });
      }

      const existing = await db('hostel_billing').where('hostel_id', hostelId).first();
      const frequency = billing_frequency || existing?.billing_frequency || 'MONTHLY';

      // First time an amount is set with no explicit date: start the clock one
      // full cycle out, so the hostel isn't instantly "overdue".
      const resolvedDueDate = next_due_date
        ? toDateOnly(parseDateOnly(next_due_date)!)
        : existing?.next_due_date
        ? toDateOnly(new Date(existing.next_due_date))
        : toDateOnly(addMonths(new Date(), FREQUENCY_MONTHS[frequency] || 1));

      const payload: Record<string, any> = {
        hostel_id: hostelId,
        owner_id: hostel.owner_id || null,
        billing_frequency: frequency,
        next_due_date: resolvedDueDate,
        notes: notes === undefined ? existing?.notes ?? null : notes || null,
        status: status || existing?.status || 'ACTIVE',
      };
      if (amount !== undefined) payload.agreed_amount = amount;
      else if (!existing) payload.agreed_amount = 0;

      if (existing) {
        await db('hostel_billing').where('billing_id', existing.billing_id).update(payload);
      } else {
        await db('hostel_billing').insert(payload);
      }

      await logDeveloperAction({
        developer_id: req.developer?.id,
        developer_username: req.developer?.username,
        action: existing ? 'BILLING_UPDATED' : 'BILLING_CREATED',
        target_type: 'HOSTEL_BILLING',
        target_id: hostelId,
        hostel_id: hostelId,
        metadata: payload,
        req,
      });

      const updated = await db('hostel_billing').where('hostel_id', hostelId).first();
      return res.json({
        success: true,
        message: `Billing saved for ${hostel.hostel_name}`,
        data: updated,
      });
    } catch (error: any) {
      console.error('upsertBilling error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * Record an instalment received from a hostel and roll its schedule forward.
   * Both writes happen in one transaction so a payment can never be logged
   * without the schedule moving (which would leave the hostel stuck overdue).
   */
  async recordPayment(req: DeveloperAuthRequest, res: Response) {
    try {
      const hostelId = parseInt(req.params.hostelId, 10);
      if (!hostelId) {
        return res.status(400).json({ success: false, error: 'Invalid hostel id' });
      }

      const hostel = await db('hostel_master')
        .where('hostel_id', hostelId)
        .select('hostel_id', 'hostel_name')
        .first();
      if (!hostel) {
        return res.status(404).json({ success: false, error: 'Hostel not found' });
      }

      const billing = await db('hostel_billing').where('hostel_id', hostelId).first();
      if (!billing) {
        return res.status(400).json({
          success: false,
          error: 'Set an agreed billing amount for this hostel before recording a payment.',
        });
      }

      const amount = Number(req.body?.amount ?? billing.agreed_amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, error: 'amount must be greater than 0' });
      }

      const paidOnDate = req.body?.paid_on ? parseDateOnly(req.body.paid_on) : new Date();
      if (!paidOnDate) {
        return res.status(400).json({ success: false, error: 'paid_on is not a valid date' });
      }
      const paidOn = toDateOnly(paidOnDate);

      // Advance from the existing due date when it is still in the future
      // (paying early must not shorten the next cycle); otherwise from today.
      const currentDue = parseDateOnly(billing.next_due_date);
      const anchor = currentDue && daysUntil(currentDue) > 0 ? currentDue : paidOnDate;
      const nextDue = toDateOnly(
        addMonths(anchor, FREQUENCY_MONTHS[billing.billing_frequency] || 1)
      );

      await db.transaction(async (trx) => {
        await trx('hostel_billing_payments').insert({
          hostel_id: hostelId,
          billing_id: billing.billing_id,
          amount,
          paid_on: paidOn,
          payment_method: req.body?.payment_method || null,
          reference: req.body?.reference || null,
          notes: req.body?.notes || null,
          recorded_by: req.developer?.id || null,
        });

        await trx('hostel_billing').where('billing_id', billing.billing_id).update({
          last_payment_date: paidOn,
          next_due_date: nextDue,
        });
      });

      await logDeveloperAction({
        developer_id: req.developer?.id,
        developer_username: req.developer?.username,
        action: 'BILLING_PAYMENT_RECORDED',
        target_type: 'HOSTEL_BILLING',
        target_id: hostelId,
        hostel_id: hostelId,
        metadata: { amount, paid_on: paidOn, next_due_date: nextDue },
        req,
      });

      void notifyDeveloper({
        type: 'PAYMENT_RECEIVED',
        title: 'Platform Payment Recorded',
        message: `₹${amount.toLocaleString('en-IN')} received from ${hostel.hostel_name}. Next due ${nextDue}.`,
        priority: 'NORMAL',
        relatedEntity: 'BILLING',
        relatedEntityId: hostelId,
        metadata: { hostel_id: hostelId, amount, paid_on: paidOn, next_due_date: nextDue },
      });

      return res.json({
        success: true,
        message: `₹${amount.toLocaleString('en-IN')} recorded for ${hostel.hostel_name}`,
        data: { hostel_id: hostelId, amount, paid_on: paidOn, next_due_date: nextDue },
      });
    } catch (error: any) {
      console.error('recordPayment error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /** Payment history for one hostel (newest first). */
  async getPaymentHistory(req: DeveloperAuthRequest, res: Response) {
    try {
      const hostelId = parseInt(req.params.hostelId, 10);
      if (!hostelId) {
        return res.status(400).json({ success: false, error: 'Invalid hostel id' });
      }
      const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '30', 10)));

      const payments = await db('hostel_billing_payments')
        .where('hostel_id', hostelId)
        .orderBy('paid_on', 'desc')
        .orderBy('payment_id', 'desc')
        .limit(limit);

      const totalRes = await db('hostel_billing_payments')
        .where('hostel_id', hostelId)
        .sum('amount as total')
        .first();

      return res.json({
        success: true,
        data: { payments, total_received: num(totalRes?.total) },
      });
    } catch (error: any) {
      console.error('getPaymentHistory error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /** Delete a recorded instalment (mistyped entry). Does not rewind the schedule. */
  async deletePayment(req: DeveloperAuthRequest, res: Response) {
    try {
      const paymentId = parseInt(req.params.paymentId, 10);
      if (!paymentId) {
        return res.status(400).json({ success: false, error: 'Invalid payment id' });
      }
      const existing = await db('hostel_billing_payments').where('payment_id', paymentId).first();
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }

      await db('hostel_billing_payments').where('payment_id', paymentId).del();

      await logDeveloperAction({
        developer_id: req.developer?.id,
        developer_username: req.developer?.username,
        action: 'BILLING_PAYMENT_DELETED',
        target_type: 'HOSTEL_BILLING',
        target_id: existing.hostel_id,
        hostel_id: existing.hostel_id,
        metadata: { payment_id: paymentId, amount: num(existing.amount) },
        req,
      });

      return res.json({ success: true, message: 'Payment entry removed' });
    } catch (error: any) {
      console.error('deletePayment error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /** Upcoming + overdue instalments, soonest first. */
  async getDues(req: DeveloperAuthRequest, res: Response) {
    try {
      const rows = (await loadBillingRows()).filter((r) => r.is_billable);

      const buckets = {
        overdue: [] as any[],
        due_today: [] as any[],
        due_soon: [] as any[],
        upcoming: [] as any[],
      };

      for (const r of rows) {
        const entry = {
          hostel_id: r.hostel_id,
          hostel_name: r.hostel_name,
          owner_name: r.owner_name,
          amount: r.agreed_amount,
          next_due_date: r.next_due_date,
          days_remaining: r.days_remaining,
          payment_state: r.payment_state,
          billing_frequency: r.billing_frequency,
        };
        if (r.payment_state === 'OVERDUE') buckets.overdue.push(entry);
        else if (r.payment_state === 'DUE_TODAY') buckets.due_today.push(entry);
        else if (r.payment_state === 'DUE_SOON') buckets.due_soon.push(entry);
        else buckets.upcoming.push(entry);
      }

      const bySoonest = (a: any, b: any) => (a.days_remaining ?? 0) - (b.days_remaining ?? 0);
      buckets.overdue.sort(bySoonest);
      buckets.due_soon.sort(bySoonest);
      buckets.upcoming.sort(bySoonest);

      const sum = (list: any[]) => list.reduce((a, r) => a + num(r.amount), 0);

      return res.json({
        success: true,
        data: {
          ...buckets,
          totals: {
            overdue: sum(buckets.overdue),
            due_today: sum(buckets.due_today),
            due_soon: sum(buckets.due_soon),
            upcoming: sum(buckets.upcoming),
          },
        },
      });
    } catch (error: any) {
      console.error('getDues error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Platform expenses ─────────────────────────────────────────────────────
  async getExpenses(req: DeveloperAuthRequest, res: Response) {
    try {
      const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) || '60', 10)));
      const category = req.query.category as string;
      const from = req.query.from ? parseDateOnly(req.query.from) : null;
      const to = req.query.to ? parseDateOnly(req.query.to) : null;

      let query = db('platform_expenses');
      if (category) query = query.where('category', category);
      if (from) query = query.where('expense_date', '>=', toDateOnly(from));
      if (to) query = query.where('expense_date', '<=', toDateOnly(to));

      const expenses = await query
        .clone()
        .orderBy('expense_date', 'desc')
        .orderBy('expense_id', 'desc')
        .limit(limit);

      const totalRes = await query.clone().sum('amount as total').first();
      const byCategory = await query
        .clone()
        .select('category')
        .sum('amount as amount')
        .groupBy('category')
        .orderBy('amount', 'desc');

      const monthStart = new Date();
      monthStart.setDate(1);
      const thisMonthRes = await db('platform_expenses')
        .where('expense_date', '>=', toDateOnly(monthStart))
        .sum('amount as total')
        .first();

      return res.json({
        success: true,
        data: {
          expenses,
          categories: EXPENSE_CATEGORIES,
          total: num(totalRes?.total),
          total_this_month: num(thisMonthRes?.total),
          by_category: (byCategory as any[]).map((r) => ({
            category: r.category,
            amount: num(r.amount),
          })),
        },
      });
    } catch (error: any) {
      console.error('getExpenses (platform) error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async createExpense(req: DeveloperAuthRequest, res: Response) {
    try {
      const { category, description, amount, expense_date, notes } = req.body || {};

      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) {
        return res.status(400).json({ success: false, error: 'amount must be greater than 0' });
      }
      const date = expense_date ? parseDateOnly(expense_date) : new Date();
      if (!date) {
        return res.status(400).json({ success: false, error: 'expense_date is not a valid date' });
      }

      const [expenseId] = await db('platform_expenses').insert({
        category: category || 'Other',
        description: description || null,
        amount: value,
        expense_date: toDateOnly(date),
        notes: notes || null,
        created_by: req.developer?.id || null,
      });

      await logDeveloperAction({
        developer_id: req.developer?.id,
        developer_username: req.developer?.username,
        action: 'PLATFORM_EXPENSE_CREATED',
        target_type: 'PLATFORM_EXPENSE',
        target_id: expenseId,
        metadata: { category: category || 'Other', amount: value },
        req,
      });

      const created = await db('platform_expenses').where('expense_id', expenseId).first();
      return res.status(201).json({ success: true, message: 'Expense recorded', data: created });
    } catch (error: any) {
      console.error('createExpense (platform) error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateExpense(req: DeveloperAuthRequest, res: Response) {
    try {
      const expenseId = parseInt(req.params.id, 10);
      if (!expenseId) {
        return res.status(400).json({ success: false, error: 'Invalid expense id' });
      }
      const existing = await db('platform_expenses').where('expense_id', expenseId).first();
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Expense not found' });
      }

      const { category, description, amount, expense_date, notes } = req.body || {};
      const patch: Record<string, any> = {};

      if (amount !== undefined) {
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) {
          return res.status(400).json({ success: false, error: 'amount must be greater than 0' });
        }
        patch.amount = value;
      }
      if (expense_date !== undefined) {
        const date = parseDateOnly(expense_date);
        if (!date) {
          return res.status(400).json({ success: false, error: 'expense_date is not a valid date' });
        }
        patch.expense_date = toDateOnly(date);
      }
      if (category !== undefined) patch.category = category || 'Other';
      if (description !== undefined) patch.description = description || null;
      if (notes !== undefined) patch.notes = notes || null;

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ success: false, error: 'Nothing to update' });
      }

      await db('platform_expenses').where('expense_id', expenseId).update(patch);

      await logDeveloperAction({
        developer_id: req.developer?.id,
        developer_username: req.developer?.username,
        action: 'PLATFORM_EXPENSE_UPDATED',
        target_type: 'PLATFORM_EXPENSE',
        target_id: expenseId,
        metadata: patch,
        req,
      });

      const updated = await db('platform_expenses').where('expense_id', expenseId).first();
      return res.json({ success: true, message: 'Expense updated', data: updated });
    } catch (error: any) {
      console.error('updateExpense (platform) error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteExpense(req: DeveloperAuthRequest, res: Response) {
    try {
      const expenseId = parseInt(req.params.id, 10);
      if (!expenseId) {
        return res.status(400).json({ success: false, error: 'Invalid expense id' });
      }
      const existing = await db('platform_expenses').where('expense_id', expenseId).first();
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Expense not found' });
      }

      await db('platform_expenses').where('expense_id', expenseId).del();

      await logDeveloperAction({
        developer_id: req.developer?.id,
        developer_username: req.developer?.username,
        action: 'PLATFORM_EXPENSE_DELETED',
        target_type: 'PLATFORM_EXPENSE',
        target_id: expenseId,
        metadata: { amount: num(existing.amount), category: existing.category },
        req,
      });

      return res.json({ success: true, message: 'Expense deleted' });
    } catch (error: any) {
      console.error('deleteExpense (platform) error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── Developer notification centre ─────────────────────────────────────────
  async getNotifications(req: DeveloperAuthRequest, res: Response) {
    try {
      const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '40', 10)));
      const unreadOnly = String(req.query.unread_only || '') === 'true';

      let query = db('developer_notifications');
      if (unreadOnly) query = query.where('is_read', 0);

      const notifications = await query
        .orderBy('created_at', 'desc')
        .orderBy('notification_id', 'desc')
        .limit(limit);

      const unreadRes = await db('developer_notifications')
        .where('is_read', 0)
        .count('notification_id as total')
        .first();

      return res.json({
        success: true,
        data: {
          notifications: notifications.map((n: any) => ({
            ...n,
            is_read: Number(n.is_read) === 1,
            metadata: typeof n.metadata === 'string' ? safeJson(n.metadata) : n.metadata,
          })),
          unread_count: num(unreadRes?.total),
        },
      });
    } catch (error: any) {
      console.error('getNotifications (developer) error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async markNotificationRead(req: DeveloperAuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ success: false, error: 'Invalid notification id' });

      const updated = await db('developer_notifications')
        .where('notification_id', id)
        .update({ is_read: 1 });
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Notification not found' });
      }
      return res.json({ success: true, message: 'Notification marked read' });
    } catch (error: any) {
      console.error('markNotificationRead error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async markAllNotificationsRead(req: DeveloperAuthRequest, res: Response) {
    try {
      const updated = await db('developer_notifications').where('is_read', 0).update({ is_read: 1 });
      return res.json({ success: true, message: `${updated} notification(s) marked read` });
    } catch (error: any) {
      console.error('markAllNotificationsRead error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },
};

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default developerFinanceController;
