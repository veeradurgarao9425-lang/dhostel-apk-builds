import cron from 'node-cron';
import db from '../config/database.js';
import { sendNotificationToStudent, sendNotificationToHostelOwner } from '../utils/notification.js';

/**
 * Server-side fee reminders — the tenant app only ever scheduled *local*
 * reminders on-device (wiped on reinstall, never reach a device that isn't
 * open). This job sends the same 7/3/1/0-day-before nudge as a real push +
 * in-app notification, plus a recurring nag once a fee is overdue.
 *
 * `monthly_fees.due_reminder_sent_date` / `overdue_reminder_sent_date`
 * (added in database.ts schema-patch #25) dedupe sends per day.
 */

const DUE_SOON_DAYS = [7, 3, 1, 0];
const OVERDUE_RENAG_DAYS = 7;

const todayStr = () => new Date().toISOString().split('T')[0];

export const runFeeReminders = async () => {
  try {
    const today = todayStr();

    // ── Due soon: 7/3/1/0 days before due_date, not already reminded today ──
    const dueSoon = await db('monthly_fees as mf')
      .leftJoin('students as s', 'mf.student_id', 's.student_id')
      .whereNot('mf.fee_status', 'Fully Paid')
      .whereRaw('mf.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)')
      .where(function () {
        this.whereNull('mf.due_reminder_sent_date').orWhereNot('mf.due_reminder_sent_date', today);
      })
      .select('mf.*', 's.first_name', 's.last_name', 's.room_number', 's.hostel_id');

    let dueSoonNotified = 0;
    for (const fee of dueSoon) {
      const due = new Date(fee.due_date);
      const now = new Date();
      due.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((due.getTime() - now.getTime()) / 86400000);
      if (!DUE_SOON_DAYS.includes(daysLeft)) continue;

      const balance = Number(fee.balance || 0);
      const title = daysLeft === 0 ? 'Rent Due Today 📅' : `Rent Due in ${daysLeft} Day${daysLeft === 1 ? '' : 's'} ⏳`;
      const message = daysLeft === 0
        ? `₹${balance.toLocaleString('en-IN')} is due today. Avoid late fees — pay now.`
        : `₹${balance.toLocaleString('en-IN')} is due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`;

      // 1. Notify Student
      await sendNotificationToStudent(
        fee.student_id,
        'Payment Due',
        title,
        message,
        daysLeft <= 1 ? 'High' : 'Medium',
        { fee_id: fee.fee_id },
        {
          screen: 'RentPayment',
          params: { feeId: fee.fee_id },
          referenceType: 'monthly_fee',
          referenceId: fee.fee_id,
          deduplicateKey: `fee_due_${fee.fee_id}_${daysLeft}d`
        }
      ).catch((err) => console.error('[feeReminders] due-soon notify failed:', err?.message));

      // 2. Notify Owner (when 7 days remain or due today)
      if (fee.hostel_id && (daysLeft === 7 || daysLeft === 0)) {
        await sendNotificationToHostelOwner(
          fee.hostel_id,
          'Payment Due',
          daysLeft === 0 ? `Rent Due Today: ${fee.first_name || 'Tenant'}` : `Upcoming Due (7d): ${fee.first_name || 'Tenant'}`,
          `${fee.first_name || 'Tenant'} (Room ${fee.room_number || '-'}) has ₹${balance.toLocaleString('en-IN')} ${daysLeft === 0 ? 'due today' : 'due in 7 days'}.`,
          'Medium',
          { fee_id: fee.fee_id, student_id: fee.student_id },
          {
            screen: 'PendingPayments',
            params: { tab: daysLeft === 0 ? 'All Dues' : 'Next 7 Days' },
            deduplicateKey: `owner_due_alert_${fee.fee_id}_${daysLeft}d`
          }
        ).catch(() => {});
      }

      await db('monthly_fees').where('fee_id', fee.fee_id).update({ due_reminder_sent_date: today });
      dueSoonNotified++;
    }

    // ── Overdue: past due_date, renag every OVERDUE_RENAG_DAYS days ──
    const overdue = await db('monthly_fees')
      .whereNot('fee_status', 'Fully Paid')
      .whereRaw('due_date < CURDATE()')
      .where(function () {
        this.whereNull('overdue_reminder_sent_date')
          .orWhereRaw('overdue_reminder_sent_date < DATE_SUB(CURDATE(), INTERVAL ? DAY)', [OVERDUE_RENAG_DAYS]);
      });

    let overdueNotified = 0;
    for (const fee of overdue) {
      const balance = Number(fee.balance || 0);
      await sendNotificationToStudent(
        fee.student_id,
        'Payment Due',
        'Rent Overdue',
        `₹${balance.toLocaleString('en-IN')} is overdue. Please pay as soon as possible to avoid further delay.`,
        'High',
        { fee_id: fee.fee_id },
        {
          screen: 'RentPayment',
          params: { feeId: fee.fee_id },
          referenceType: 'monthly_fee',
          referenceId: fee.fee_id,
          deduplicateKey: `fee_overdue_${fee.fee_id}_${today}`
        }
      ).catch((err) => console.error('[feeReminders] overdue notify failed:', err?.message));

      await db('monthly_fees').where('fee_id', fee.fee_id).update({ overdue_reminder_sent_date: today });
      overdueNotified++;
    }

    if (dueSoonNotified > 0 || overdueNotified > 0) {
      console.log(`[feeReminders] Notified ${dueSoonNotified} due-soon, ${overdueNotified} overdue`);
    }

    // ── Daily Owner Summary: Today's dues & Overdue count ──
    const hostels = await db('hostel_master').select('hostel_id', 'owner_id', 'hostel_name');
    for (const h of hostels) {
      if (!h.hostel_id || !h.owner_id) continue;

      const [todayDuesRow] = await db('monthly_fees')
        .where('hostel_id', h.hostel_id)
        .whereNot('fee_status', 'Fully Paid')
        .whereRaw('due_date = CURDATE()')
        .count('* as count')
        .sum('balance as totalBalance');

      const [overdueRow] = await db('monthly_fees')
        .where('hostel_id', h.hostel_id)
        .whereNot('fee_status', 'Fully Paid')
        .whereRaw('due_date < CURDATE()')
        .count('* as count')
        .sum('balance as totalBalance');

      const todayCount = Number(todayDuesRow?.count || 0);
      const overdueCount = Number(overdueRow?.count || 0);

      if (todayCount > 0 || overdueCount > 0) {
        const title = `📊 Daily Dues Summary (${todayCount} Today, ${overdueCount} Overdue)`;
        const message = `You have ${todayCount} rent payment(s) due today and ${overdueCount} overdue bill(s). Tap to view pending payments.`;

        await sendNotificationToHostelOwner(
          h.hostel_id,
          'Payment Due',
          title,
          message,
          'Medium',
          { todayCount, overdueCount },
          {
            screen: 'PendingPayments',
            params: { tab: overdueCount > 0 ? 'Overdue' : 'All Dues' },
            deduplicateKey: `daily_owner_dues_digest_${h.hostel_id}_${today}`
          }
        ).catch(() => {});
      }
    }

    // ── Weekly Monday Summary (if today is Monday) ──
    const isMonday = new Date().getDay() === 1;
    if (isMonday) {
      for (const h of hostels) {
        if (!h.hostel_id || !h.owner_id) continue;

        const [next7Row] = await db('monthly_fees')
          .where('hostel_id', h.hostel_id)
          .whereNot('fee_status', 'Fully Paid')
          .whereRaw('due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)')
          .count('* as count')
          .sum('balance as totalBalance');

        const [lastWeekCollection] = await db('fee_payments')
          .where('hostel_id', h.hostel_id)
          .whereRaw('payment_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)')
          .sum('amount as totalCollected');

        const next7Count = Number(next7Row?.count || 0);
        const next7Amt = Number(next7Row?.totalBalance || 0);
        const collectedAmt = Number(lastWeekCollection?.totalCollected || 0);

        await sendNotificationToHostelOwner(
          h.hostel_id,
          'General',
          '📈 Weekly Hostel Summary',
          `Last 7 Days: ₹${collectedAmt.toLocaleString('en-IN')} collected. Next 7 Days: ${next7Count} dues (₹${next7Amt.toLocaleString('en-IN')}) expected.`,
          'Medium',
          { next7Count, next7Amt, collectedAmt },
          {
            screen: 'Reports',
            params: { tab: 'weekly' },
            deduplicateKey: `weekly_owner_summary_${h.hostel_id}_${today}`
          }
        ).catch(() => {});
      }
    }

    return { success: true, dueSoonNotified, overdueNotified };
  } catch (error: any) {
    console.error('[feeReminders] Error:', error?.message);
    return { success: false, error: error?.message };
  }
};

export const startFeeRemindersJob = () => {
  // Run daily at 09:00 AM
  const pattern = '0 9 * * *';
  const job = cron.schedule(pattern, () => {
    runFeeReminders().catch((e) => console.error('[feeReminders] cron run failed:', e?.message));
  });

  console.log('✓ Fee reminders & Daily/Weekly digests scheduled (daily 09:00 AM)');
  return job;
};
