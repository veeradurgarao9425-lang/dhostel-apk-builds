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
      const name = `${s.first_name}${s.last_name ? ' ' + s.last_name : ''}`;
      const dateStr = new Date(s.vacate_notice_date).toISOString().split('T')[0];
      await sendNotificationToHostelOwner(
        s.hostel_id,
        'General',
        'Bed Becoming Vacant',
        `${s.room_number ? `Room ${s.room_number} — ` : ''}${name} is vacating on ${dateStr}. Prepare for turnover.`,
        'Medium',
        { student_id: s.student_id }
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
        'Reminder',
        r.title,
        'Medium',
        { reminder_id: r.reminder_id }
      ).catch((err) => console.error('[ownerDailyAlerts] reminder notify failed:', err?.message));

      await db('reminders').where('reminder_id', r.reminder_id).update({ notified: 1 });
      reminderNotified++;
    }

    if (vacancyNotified > 0 || reminderNotified > 0) {
      console.log(`[ownerDailyAlerts] Notified ${vacancyNotified} upcoming vacancies, ${reminderNotified} reminders`);
    }
    return { success: true, vacancyNotified, reminderNotified };
  } catch (error: any) {
    console.error('[ownerDailyAlerts] Error:', error?.message);
    return { success: false, error: error?.message };
  }
};

export const startOwnerDailyAlertsJob = () => {
  // Production: daily at 08:30. Development: every hour at minute 20.
  const pattern = process.env.NODE_ENV === 'production' ? '30 8 * * *' : '20 * * * *';
  const job = cron.schedule(pattern, () => {
    runOwnerDailyAlerts().catch((e) => console.error('[ownerDailyAlerts] cron run failed:', e?.message));
  });

  console.log(`✓ Owner daily alerts job scheduled (${process.env.NODE_ENV === 'production' ? 'daily 08:30' : 'hourly :20'})`);
  return job;
};
