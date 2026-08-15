import cron from 'node-cron';
import db from '../config/database.js';
import { sendEmail } from '../utils/email.js';
import { getWeeklyReportTemplate } from '../utils/emailTemplates.js';

export const startWeeklyReportsJob = () => {
  // Run every Monday at 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    console.log('[Cron] Running weekly business report job...');
    try {
      const hostels = await db('hostel_master')
        .join('users', 'hostel_master.owner_id', '=', 'users.user_id')
        .select('hostel_master.*', 'users.email', 'users.full_name', 'users.user_id')
        .where('hostel_master.is_active', 1);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];

      for (const hostel of hostels) {
        try {
          // Calculate Stats
          
          // Total Students
          const [studentCount] = await db('students')
            .where({ hostel_id: hostel.hostel_id, is_active: 1 })
            .count('student_id as count');
          const totalStudents = Number(studentCount?.count || 0);

          // Total Capacity & Occupied Beds
          const rooms = await db('rooms')
            .where({ hostel_id: hostel.hostel_id })
            .select('capacity', 'occupied_beds');
          
          let totalCapacity = 0;
          let occupiedBeds = 0;
          rooms.forEach(r => {
            totalCapacity += r.capacity;
            occupiedBeds += r.occupied_beds;
          });
          const availableBeds = totalCapacity - occupiedBeds;
          const occupancyPercentage = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

          // Collections this week — use fee_payments (active table)
          const [collections] = await db('fee_payments')
            .where({ hostel_id: hostel.hostel_id })
            .where('payment_date', '>=', oneWeekAgoStr)
            .sum('amount as sum');
          const totalCollections = Number(collections?.sum || 0);

          // Expenses this week
          const [expenses] = await db('expenses')
            .where({ hostel_id: hostel.hostel_id })
            .where('expense_date', '>=', oneWeekAgoStr)
            .sum('amount as sum');
          const totalExpenses = Number(expenses?.sum || 0);

          // New Admissions this week
          const [newAdmissionsCount] = await db('students')
            .where({ hostel_id: hostel.hostel_id })
            .where('admission_date', '>=', oneWeekAgoStr)
            .count('student_id as count');
          const newAdmissions = Number(newAdmissionsCount?.count || 0);

          // Vacated this week
          const [vacatedCount] = await db('students')
            .where({ hostel_id: hostel.hostel_id, is_active: 0 })
            .where('inactive_date', '>=', oneWeekAgoStr)
            .count('student_id as count');
          const vacatedStudents = Number(vacatedCount?.count || 0);

          // Pending Payments — sum balance from monthly_fees (active fee table)
          const [pending] = await db('monthly_fees')
            .where({ hostel_id: hostel.hostel_id })
            .whereIn('fee_status', ['Pending', 'Partially Paid', 'Overdue'])
            .sum('balance as sum');
          const pendingPayments = Number(pending?.sum || 0);

          const reportData = {
            totalStudents,
            occupiedBeds,
            availableBeds,
            occupancyPercentage,
            collections: totalCollections,
            expenses: totalExpenses,
            newAdmissions,
            vacatedStudents,
            pendingPayments
          };

          // Send Email
          if (hostel.email) {
            await sendEmail({
              to: hostel.email,
              subject: `Weekly Business Report - ${hostel.hostel_name}`,
              html: getWeeklyReportTemplate(hostel.full_name, hostel.hostel_name, reportData),
              emailType: 'Weekly Report',
              hostelId: hostel.hostel_id
            });
          }

          // Add In-App Notification
          await db('notifications').insert({
            user_id: hostel.user_id,
            hostel_id: hostel.hostel_id,
            notification_type: 'Report',
            title: 'Weekly Report Generated',
            message: `Your weekly business report for ${hostel.hostel_name} is now available in your email.`,
            priority: 'Low'
          });

        } catch (e) {
          console.error(`[Cron] Error generating weekly report for hostel ${hostel.hostel_id}:`, e);
        }
      }
      console.log(`[Cron] Generated weekly reports for ${hostels.length} active hostels.`);
    } catch (error) {
      console.error('[Cron] Error in weekly report job:', error);
    }
  });
};
