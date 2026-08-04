import cron from 'node-cron';
import db from '../config/database.js';
import { sendDailyOwnerReportEmail } from '../utils/excelReport.js';

export const runDailyExcelReports = async () => {
  console.log('[Cron] Running daily Excel reports job for owners...');
  try {
    const hostels = await db('hostel_master')
      .where('is_active', 1)
      .select('hostel_id', 'owner_id');

    let reportsSent = 0;
    for (const hostel of hostels) {
      if (hostel.owner_id) {
        await sendDailyOwnerReportEmail(hostel.owner_id, hostel.hostel_id)
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
  // Run daily at 12:00 PM (noon). Development: every hour at minute 30.
  const pattern = process.env.NODE_ENV === 'production' ? '0 12 * * *' : '30 * * * *';
  const job = cron.schedule(pattern, () => {
    runDailyExcelReports().catch((e) => console.error('[dailyExcelReports] cron run failed:', e?.message));
  });

  console.log(`✓ Daily Excel reports job scheduled (${process.env.NODE_ENV === 'production' ? 'daily 12:00' : 'hourly :30'})`);
  return job;
};
