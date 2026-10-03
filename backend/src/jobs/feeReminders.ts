import cron from 'node-cron';
import db from '../config/database.js';
import { sendNotificationToStudent, sendNotificationToHostelOwner } from '../utils/notification.js';
import { IST_TZ, istToday, istAddDays, istDayOfWeek, inr } from '../utils/istTime.js';

/**
 * Server-side fee reminders (all times IST).
 *
 * Tenants, for every unpaid / partially paid fee:
 *   - EVERY day during the 7 days before due_date (morning run)
 *   - TWICE a day (09:00 and 18:00) on the due date and while overdue
 * Owners get an aggregate (not one push per tenant) at 09:00 and 18:00 whenever
 * anything is due-soon / due-today / overdue. The 07:05 owner morning status
 * digest lives in ownerDailyAlerts.ts.
 *
 * Duplicates are prevented with per-day-per-slot deduplicate keys, so an extra
 * run (e.g. after a server restart) never double-sends.
 */

type Slot = 'am' | 'pm';
const DUE_SOON_WINDOW_DAYS = 7;

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export const runFeeReminders = async (slot: Slot = 'am') => {
  try {
    const today = istToday();
    const in7 = istAddDays(DUE_SOON_WINDOW_DAYS);

    const baseFees = () =>
      db('monthly_fees as mf')
        .join('students as s', 'mf.student_id', 's.student_id')
        .where('mf.balance', '>', 0)
        .whereIn('s.status', [1, '1', 'Active'])
        .whereNot('mf.fee_status', 'Fully Paid')
        .select(
          'mf.fee_id',
          'mf.student_id',
          'mf.hostel_id',
          'mf.balance',
          'mf.due_date',
          'mf.fee_status',
          's.first_name',
          's.last_name',
          's.room_number'
        );

    // ── Tenants: due within 7 days (morning only), due today / overdue (both slots) ──
    const fees = await baseFees().where('mf.due_date', '<=', in7);

    let tenantNotified = 0;
    for (const fee of fees) {
      const dueStr = typeof fee.due_date === 'string'
        ? fee.due_date.slice(0, 10)
        : `${new Date(fee.due_date).getFullYear()}-${String(new Date(fee.due_date).getMonth() + 1).padStart(2, '0')}-${String(new Date(fee.due_date).getDate()).padStart(2, '0')}`;
      const daysLeft = Math.round((Date.parse(dueStr) - Date.parse(today)) / 86400000);
      if (daysLeft > 0 && slot === 'pm') continue; // upcoming: once a day only

      const balance = Number(fee.balance || 0);
      const partial = fee.fee_status === 'Partially Paid';
      const left = partial ? `${inr(balance)} still remaining` : inr(balance);

      let title: string;
      let message: string;
      if (daysLeft > 0) {
        title = `Rent Due in ${plural(daysLeft, 'Day')} ⏳`;
        message = `${left} is due in ${plural(daysLeft, 'day')}. Pay on time to avoid late fees.`;
      } else if (daysLeft === 0) {
        title = 'Rent Due Today 📅';
        message = `${left} is due today. Please pay now.`;
      } else {
        const od = Math.abs(daysLeft);
        title = `Rent Overdue (${plural(od, 'day')}) ⚠️`;
        message = `${left} is ${plural(od, 'day')} overdue. Please pay as soon as possible.`;
      }

      await sendNotificationToStudent(
        fee.student_id,
        'Payment Due',
        title,
        message,
        daysLeft <= 1 ? 'High' : 'Medium',
        { fee_id: fee.fee_id, daysLeft },
        {
          screen: 'Dues',
          params: { feeId: fee.fee_id },
          referenceType: 'monthly_fee',
          referenceId: fee.fee_id,
          deduplicateKey: `fee_tenant_${fee.fee_id}_${today}_${slot}`,
        }
      ).catch((err) => console.error('[feeReminders] tenant notify failed:', err?.message));
      tenantNotified++;
    }

    // ── Owners: one aggregate per hostel per slot ──
    const hostels = await db('hostel_master').where('is_active', 1).select('hostel_id', 'owner_id', 'hostel_name');
    let ownerNotified = 0;
    for (const h of hostels) {
      if (!h.hostel_id || !h.owner_id) continue;

      const rows = await baseFees().where('mf.hostel_id', h.hostel_id).where('mf.due_date', '<=', in7);
      if (rows.length === 0) continue;

      let overdue = 0, overdueAmt = 0, dueToday = 0, dueTodayAmt = 0, soon = 0, soonAmt = 0, partial = 0;
      for (const r of rows) {
        const d = typeof r.due_date === 'string' ? r.due_date.slice(0, 10) : new Date(r.due_date).toLocaleDateString('en-CA');
        const b = Number(r.balance || 0);
        if (r.fee_status === 'Partially Paid') partial++;
        if (d < today) { overdue++; overdueAmt += b; }
        else if (d === today) { dueToday++; dueTodayAmt += b; }
        else { soon++; soonAmt += b; }
      }

      const parts: string[] = [];
      if (overdue) parts.push(`🔴 ${overdue} overdue (${inr(overdueAmt)})`);
      if (dueToday) parts.push(`📅 ${dueToday} due today (${inr(dueTodayAmt)})`);
      if (soon) parts.push(`🗓️ ${soon} due in next 7 days (${inr(soonAmt)})`);
      if (partial) parts.push(`🟠 ${partial} partially paid`);

      await sendNotificationToHostelOwner(
        h.hostel_id,
        'Payment Due',
        slot === 'am' ? '💰 Fee follow-up needed' : '🌆 Evening fee reminder',
        parts.join('\n'),
        overdue > 0 || dueToday > 0 ? 'High' : 'Medium',
        { overdue, dueToday, soon, partial },
        {
          screen: 'PendingPayments',
          params: { tab: overdue > 0 ? 'Overdue' : 'All Dues' },
          referenceType: 'fee_followup',
          referenceId: h.hostel_id,
          deduplicateKey: `fee_owner_${h.hostel_id}_${today}_${slot}`,
        }
      ).catch(() => {});
      ownerNotified++;
    }

    // ── Weekly Monday summary (morning only) ──
    if (slot === 'am' && istDayOfWeek() === 1) {
      const weekAgo = istAddDays(-7);
      for (const h of hostels) {
        if (!h.hostel_id || !h.owner_id) continue;
        const [next7Row] = await baseFees()
          .clearSelect()
          .where('mf.hostel_id', h.hostel_id)
          .whereBetween('mf.due_date', [today, in7])
          .count('* as count')
          .sum('mf.balance as totalBalance');
        const [collected] = await db('fee_payments')
          .where('hostel_id', h.hostel_id)
          .where('payment_date', '>=', weekAgo)
          .sum('amount as totalCollected');

        await sendNotificationToHostelOwner(
          h.hostel_id,
          'General',
          '📈 Weekly Hostel Summary',
          `Last 7 days: ${inr(Number(collected?.totalCollected || 0))} collected. Next 7 days: ${Number(next7Row?.count || 0)} dues (${inr(Number(next7Row?.totalBalance || 0))}) expected.`,
          'Medium',
          {},
          { screen: 'Reports', params: { tab: 'weekly' }, deduplicateKey: `weekly_owner_summary_${h.hostel_id}_${today}` }
        ).catch(() => {});
      }
    }

    console.log(`[feeReminders] ${today} ${slot} IST: ${tenantNotified} tenant reminders, ${ownerNotified} owner follow-ups`);
    return { success: true, tenantNotified, ownerNotified };
  } catch (error: any) {
    console.error('[feeReminders] Error:', error?.message);
    return { success: false, error: error?.message };
  }
};

export const startFeeRemindersJob = () => {
  const opts = { timezone: IST_TZ };
  // 09:00 AM and 06:00 PM IST
  const am = cron.schedule('0 9 * * *', () => {
    runFeeReminders('am').catch((e) => console.error('[feeReminders] am run failed:', e?.message));
  }, opts);
  cron.schedule('0 18 * * *', () => {
    runFeeReminders('pm').catch((e) => console.error('[feeReminders] pm run failed:', e?.message));
  }, opts);

  // Startup catch-up (per-slot dedupe keys make repeats harmless). Only the slot whose time has passed.
  setTimeout(() => {
    const hourIST = Number(new Intl.DateTimeFormat('en-GB', { timeZone: IST_TZ, hour: '2-digit', hour12: false }).format(new Date()));
    if (hourIST >= 9) runFeeReminders('am').catch((e) => console.error('[feeReminders] startup am failed:', e?.message));
    if (hourIST >= 18) runFeeReminders('pm').catch((e) => console.error('[feeReminders] startup pm failed:', e?.message));
  }, 15000);

  console.log('✓ Fee reminders scheduled (09:00 & 18:00 IST + startup catch-up)');
  return am;
};
