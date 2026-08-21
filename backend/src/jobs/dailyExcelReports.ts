import cron from 'node-cron';
import db from '../config/database.js';
import { sendDailyOwnerReportEmail } from '../utils/excelReport.js';

export const runDailyExcelReports = async () => {
  console.log('[Cron] Running daily Excel reports job for owners...');
  try {
    const hostels = await db('hostel_master')
      .where('is_active', 1)
      .select('hostel_id', 'owner_id', 'hostel_name');

    let reportsSent = 0;
    for (const hostel of hostels) {
      let ownerId = hostel.owner_id;
      if (!ownerId) {
        const ownerUser = await db('users').where({ hostel_id: hostel.hostel_id, role_id: 2 }).first();
        ownerId = ownerUser?.user_id;
      }
      if (ownerId) {
        await sendDailyOwnerReportEmail(ownerId, hostel.hostel_id)
          .catch((err) => console.error(`[dailyExcelReports] Failed for hostel ${hostel.hostel_id}:`, err?.message));
        reportsSent++;
      }
    }
    console.log(`[Cron] Daily Excel reports job complete. Sent ${reportsSent} reports.`);
    return { success: true, reportsSent };
  } catch (error: any) {
    console.error('[dailyExcelReports] Error in cron job:', error?.message);
    return { success: false, error: error?.message };
  }
};

export const startDailyExcelReportsJob = () => {
  // Run automatically on the 10th of every month at 12:00 AM Midnight
  const pattern = '0 0 10 * *';
  const job = cron.schedule(pattern, () => {
    console.log('[Cron] Triggering 10th of month automated Excel business report dispatch...');
    runDailyExcelReports().catch((e) => console.error('[dailyExcelReports] cron run failed:', e?.message));
  });

  console.log('✓ Monthly Executive Excel reports job scheduled (10th of every month at 12:00 AM Midnight)');
  return job;
};

