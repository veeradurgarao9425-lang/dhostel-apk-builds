import cron from 'node-cron';
import db from '../config/database.js';
import { sendNotificationToHostelOwner } from '../utils/notification.js';

/**
 * Cron Job: Overdue Fees Notifier
 *
 * Schedule: Runs daily at 9:00 AM
 * Pattern: '0 9 * * *'
 *
 * What it does:
 * - Checks all monthly_fees that have balance > 0 and where due_date has passed
 * - Notifies the hostel owner about newly overdue students (1 day overdue)
 * - Optionally can notify for 3 days or 7 days overdue as well
 */

const checkOverdueFees = async () => {
  try {
    console.log('[Overdue Notifier] Checking for overdue fees...');

    // Get today's date and yesterday's date at midnight for strict comparison
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Find fees where the due date was exactly yesterday (so they are 1 day overdue today)
    const overdueFees = await db('monthly_fees as mf')
      .join('students as s', 'mf.student_id', '=', 's.student_id')
      .where('mf.balance', '>', 0)
      .whereRaw('DATE(mf.due_date) = ?', [yesterdayStr])
      .select('mf.hostel_id', 's.first_name', 's.last_name', 'mf.balance', 'mf.due_date');

    if (overdueFees.length === 0) {
      console.log('[Overdue Notifier] No new 1-day overdue fees found today.');
      return;
    }

    // Group by hostel
    const hostelMap: Record<number, any[]> = {};
    for (const fee of overdueFees) {
      if (!hostelMap[fee.hostel_id]) hostelMap[fee.hostel_id] = [];
      hostelMap[fee.hostel_id].push(fee);
    }

    // Send notifications to each hostel owner
    for (const hostelId of Object.keys(hostelMap)) {
      const hid = parseInt(hostelId, 10);
      const fees = hostelMap[hid];
      const count = fees.length;

      let msg = '';
      if (count === 1) {
        msg = `${fees[0].first_name} is exactly 1 day overdue on their rent (₹${fees[0].balance}). Please send a reminder.`;
      } else {
        msg = `You have ${count} students who became 1 day overdue today. Total overdue balance: ₹${fees.reduce((sum, f) => sum + (parseFloat(f.balance) || 0), 0)}.`;
      }

      await sendNotificationToHostelOwner(
        hid,
        'Payment Due',
        'Overdue Rent Alert',
        msg,
        'High'
      );
      
      console.log(`[Overdue Notifier] Sent notification to hostel ${hid} for ${count} overdue fees.`);
    }

  } catch (err) {
    console.error('[Overdue Notifier] Error checking overdue fees:', err);
  }
};

export const startOverdueNotifierJob = () => {
  // Run daily at 09:00 AM
  cron.schedule('0 9 * * *', () => {
    console.log('[Overdue Notifier] Triggering scheduled job...');
    checkOverdueFees();
  });
  console.log('[Cron] Overdue Notifier scheduled (Daily at 09:00 AM)');
};
