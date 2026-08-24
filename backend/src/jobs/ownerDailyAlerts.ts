import cron from 'node-cron';
import db from '../config/database.js';
import { sendNotificationToHostelOwner } from '../utils/notification.js';

/**
 * Two independent owner-facing daily checks that previously had zero
 * notification code:
 *
 * 1. Vacancy forecast — a tenant who submitted a vacate notice
 *    (students.vacate_notice_date) within the next 3 days but hasn't been
 *    flagged yet (vacate_reminder_sent), so the owner can prepare the bed.
 * 2. Personal reminders — the owner's own `reminders` list (reminderController.ts)
 *    had full CRUD but never actually notified anyone when a reminder came due.
 *
 * Both use a "notify once via flag" column, added in database.ts schema-patch #26/#27.
 */

const VACANCY_FORECAST_DAYS = 3;

export const runOwnerDailyAlerts = async () => {
  try {
    const upcomingVacancies = await db('students as s')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .whereNotNull('s.vacate_notice_date')
      .where('s.vacate_reminder_sent', 0)
      .whereRaw('s.vacate_notice_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)', [VACANCY_FORECAST_DAYS])
      .select('s.student_id', 's.hostel_id', 's.first_name', 's.last_name', 's.vacate_notice_date', 'r.room_number');

    let vacancyNotified = 0;
    for (const s of upcomingVacancies) {
      const name = `${s.first_name}${s.last_name ? ' ' + s.last_name : ''}`.trim();
      const dateStr = new Date(s.vacate_notice_date).toISOString().split('T')[0];
      await sendNotificationToHostelOwner(
        s.hostel_id,
        'General',
        'Bed Becoming Vacant Soon',
        `${s.room_number ? `Room ${s.room_number} — ` : ''}${name} is vacating on ${dateStr}. Prepare for turnover.`,
        'Medium',
        { student_id: s.student_id, studentId: s.student_id },
        { screen: 'StudentDetails', params: { studentId: s.student_id }, referenceType: 'student', referenceId: s.student_id }
      ).catch((err) => console.error('[ownerDailyAlerts] vacancy notify failed:', err?.message));

      await db('students').where('student_id', s.student_id).update({ vacate_reminder_sent: 1 });
      vacancyNotified++;
    }

    const dueReminders = await db('reminders')
      .whereRaw('reminder_date = CURDATE()')
      .where('status', 'PENDING')
      .where('notified', 0);

    let reminderNotified = 0;
    for (const r of dueReminders) {
      await sendNotificationToHostelOwner(
        r.hostel_id,
        'General',
        'Personal Reminder Due',
        r.title,
        'Medium',
        { reminder_id: r.reminder_id },
        { screen: 'More', referenceType: 'reminder', referenceId: r.reminder_id }
      ).catch((err) => console.error('[ownerDailyAlerts] reminder notify failed:', err?.message));

      await db('reminders').where('reminder_id', r.reminder_id).update({ notified: 1 });
      reminderNotified++;
    }

    // 3. Daily dues and overdues summary for owners (Active residents only)
    const hostels = await db('hostel_master').where('is_active', 1);
    let duesSummariesNotified = 0;
    for (const h of hostels) {
      try {
        // Find active students with due today + fetch up to 3 names
        const dueTodayList = await db('monthly_fees as mf')
          .join('students as s', 'mf.student_id', 's.student_id')
          .where('mf.hostel_id', h.hostel_id)
          .where('s.status', 1)
          .where('mf.balance', '>', 0)
          .whereIn('mf.fee_status', ['Pending', 'Partially Paid', 'Overdue'])
          .whereRaw('mf.due_date = CURDATE()')
          .select('s.first_name', 's.last_name', 'mf.balance');

        // Find active students with overdue balance
        const overdueStats = await db('monthly_fees as mf')
          .join('students as s', 'mf.student_id', 's.student_id')
          .where('mf.hostel_id', h.hostel_id)
          .where('s.status', 1)
          .where('mf.balance', '>', 0)
          .whereIn('mf.fee_status', ['Pending', 'Partially Paid', 'Overdue'])
          .whereRaw('mf.due_date < CURDATE()')
          .count('mf.fee_id as count')
          .first();

        // Total pending for active students
        const totalPendingStats = await db('monthly_fees as mf')
          .join('students as s', 'mf.student_id', 's.student_id')
          .where('mf.hostel_id', h.hostel_id)
          .where('s.status', 1)
          .where('mf.balance', '>', 0)
          .whereIn('mf.fee_status', ['Pending', 'Partially Paid', 'Overdue'])
          .sum('mf.balance as total')
          .first();

        const overdueCount = Number(overdueStats?.count || 0);
        const dueTodayCount = dueTodayList.length;
        const pendingAmount = Number(totalPendingStats?.total || 0);

        let message = '';
        if (dueTodayCount > 0 && dueTodayCount <= 2) {
          const names = dueTodayList.map((d: any) => d.first_name).join(' & ');
          message = `Good morning! ${names}'s rent is due today (₹${pendingAmount.toLocaleString('en-IN')}). ${overdueCount > 0 ? `${overdueCount} payment(s) overdue.` : ''}`.trim();
        } else if (dueTodayCount > 2) {
          message = `Good morning! ${dueTodayCount} rents are due today (₹${pendingAmount.toLocaleString('en-IN')}). ${overdueCount > 0 ? `${overdueCount} payment(s) overdue.` : ''}`.trim();
        } else if (overdueCount > 0) {
          message = `Morning update: ${overdueCount} overdue rent payment(s) totaling ₹${pendingAmount.toLocaleString('en-IN')}. Tap to review.`;
        }

        if (message) {
          await sendNotificationToHostelOwner(
            h.hostel_id,
            'System Alert',
            'Daily Dues Morning Summary',
            message,
            'High',
            { dueTodayCount, overdueCount, pendingAmount },
            {
              screen: 'PendingTab',
              referenceType: 'dues_summary',
              referenceId: h.hostel_id,
              deduplicateKey: `daily_dues_summary_${h.hostel_id}`
            }
          );
          duesSummariesNotified++;
        }
      } catch (err: any) {
        console.error(`[ownerDailyAlerts] dues summary notify failed for hostel ${h.hostel_id}:`, err?.message);
      }
    }

    if (vacancyNotified > 0 || reminderNotified > 0 || duesSummariesNotified > 0) {
      console.log(`[ownerDailyAlerts] Notified ${vacancyNotified} upcoming vacancies, ${reminderNotified} reminders, ${duesSummariesNotified} dues summaries`);
    }
    return { success: true, vacancyNotified, reminderNotified, duesSummariesNotified };
  } catch (error: any) {
    console.error('[ownerDailyAlerts] Error:', error?.message);
    return { success: false, error: error?.message };
  }
};

export const startOwnerDailyAlertsJob = () => {
  // Run daily at 08:30 AM
  const pattern = '30 8 * * *';
  const job = cron.schedule(pattern, () => {
    runOwnerDailyAlerts().catch((e) => console.error('[ownerDailyAlerts] cron run failed:', e?.message));
  });

  console.log('✓ Owner daily alerts job scheduled (daily 08:30 AM)');
  return job;
};
