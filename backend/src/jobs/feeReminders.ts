import cron from 'node-cron';
import db from '../config/database.js';
import { sendNotificationToStudent } from '../utils/notification.js';

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
const OVERDUE_RENAG_DAYS = 1;

const todayStr = () => new Date().toISOString().split('T')[0];

export const runFeeReminders = async () => {
  try {
    const today = todayStr();

    // ── Due soon: 7/3/1/0 days before due_date, not already reminded today ──
    const dueSoon = await db('monthly_fees')
      .whereNot('fee_status', 'Fully Paid')
      .whereRaw('due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)')
      .where(function () {
        this.whereNull('due_reminder_sent_date').orWhereNot('due_reminder_sent_date', today);
      });

    let dueSoonNotified = 0;
    for (const fee of dueSoon) {
      const due = new Date(fee.due_date);
      const now = new Date();
      due.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((due.getTime() - now.getTime()) / 86400000);
      if (!DUE_SOON_DAYS.includes(daysLeft)) continue;

      const balance = Number(fee.balance || 0);
      const title = daysLeft === 0 ? 'Rent Due Today' : `Rent Due in ${daysLeft} Day${daysLeft === 1 ? '' : 's'}`;
      const message = daysLeft === 0
        ? `₹${balance} is due today. Avoid late fees — pay now.`
        : `₹${balance} is due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`;

      await sendNotificationToStudent(fee.student_id, 'Payment Due', title, message, daysLeft <= 1 ? 'High' : 'Medium', { fee_id: fee.fee_id })
        .catch((err) => console.error('[feeReminders] due-soon notify failed:', err?.message));

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
        `₹${balance} is overdue. Please pay as soon as possible to avoid further delay.`,
        'High',
        { fee_id: fee.fee_id }
      ).catch((err) => console.error('[feeReminders] overdue notify failed:', err?.message));

      await db('monthly_fees').where('fee_id', fee.fee_id).update({ overdue_reminder_sent_date: today });
      overdueNotified++;
    }

    if (dueSoonNotified > 0 || overdueNotified > 0) {
      console.log(`[feeReminders] Notified ${dueSoonNotified} due-soon, ${overdueNotified} overdue`);
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

  console.log('✓ Fee reminders job scheduled (daily 09:00 AM)');
  return job;
};
