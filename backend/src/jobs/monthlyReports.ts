import cron from 'node-cron';
import db from '../config/database.js';
import { sendEmail } from '../utils/email.js';
import { getMonthlyReportTemplate } from '../utils/emailTemplates.js';

export const startMonthlyReportsJob = () => {
  // Run 1st of every month at 9:00 AM
  cron.schedule('0 9 1 * *', async () => {
    console.log('[Cron] Running monthly business report job...');
    try {
      const hostels = await db('hostel_master')
        .join('users', 'hostel_master.owner_id', '=', 'users.user_id')
        .select('hostel_master.*', 'users.email', 'users.full_name', 'users.user_id')
        .where('hostel_master.is_active', 1);

      // Date logic for previous month
      const now = new Date();
      const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(firstDayOfCurrentMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1); // first day of last month
      const lastMonthStr = lastMonth.toISOString().split('T')[0];
      const currentMonthStr = firstDayOfCurrentMonth.toISOString().split('T')[0];

      for (const hostel of hostels) {
        try {
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
          const occupancyRate = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

          // Revenue (Collections) last month — use fee_payments (active table)
          const [collections] = await db('fee_payments')
            .where({ hostel_id: hostel.hostel_id })
            .where('payment_date', '>=', lastMonthStr)
            .where('payment_date', '<', currentMonthStr)
            .sum('amount as sum');
          const revenue = Number(collections?.sum || 0);

          // Expenses last month
          const [expenses] = await db('expenses')
            .where({ hostel_id: hostel.hostel_id })
            .where('expense_date', '>=', lastMonthStr)
            .where('expense_date', '<', currentMonthStr)
            .sum('amount as sum');
          const totalExpenses = Number(expenses?.sum || 0);
          
          const netProfit = revenue - totalExpenses;

          // New Admissions last month
          const [newAdmissionsCount] = await db('students')
            .where({ hostel_id: hostel.hostel_id })
            .where('admission_date', '>=', lastMonthStr)
            .where('admission_date', '<', currentMonthStr)
            .count('student_id as count');
          const newAdmissions = Number(newAdmissionsCount?.count || 0);

          // Vacated last month
          const [vacatedCount] = await db('students')
            .where({ hostel_id: hostel.hostel_id, is_active: 0 })
            .where('inactive_date', '>=', lastMonthStr)
            .where('inactive_date', '<', currentMonthStr)
            .count('student_id as count');
          const vacatedStudents = Number(vacatedCount?.count || 0);

          // Pending Payments — sum balance from monthly_fees (active fee table)
          const [pending] = await db('monthly_fees')
            .where({ hostel_id: hostel.hostel_id })
            .whereIn('fee_status', ['Pending', 'Partially Paid', 'Overdue'])
            .sum('balance as sum');
          const pendingPayments = Number(pending?.sum || 0);

          // Determine Performance Status
          let performanceStatus = 'Average';
          if (occupancyRate >= 85 && netProfit > 0) performanceStatus = 'Excellent';
          else if (occupancyRate >= 60 && netProfit > 0) performanceStatus = 'Good';
          else if (occupancyRate < 40 || netProfit < 0) performanceStatus = 'Needs Attention';

          const reportData = {
            revenue,
            expenses: totalExpenses,
            netProfit,
            newAdmissions,
            vacatedStudents,
            pendingPayments,
            occupancyRate,
            performanceStatus
          };

          // Send Email
          if (hostel.email) {
            await sendEmail({
              to: hostel.email,
              subject: `Monthly Business Report - ${hostel.hostel_name}`,
              html: getMonthlyReportTemplate(hostel.full_name, hostel.hostel_name, reportData),
              emailType: 'Monthly Report',
              hostelId: hostel.hostel_id
            });
          }

          // Add In-App Notification
          await db('notifications').insert({
            user_id: hostel.user_id,
            hostel_id: hostel.hostel_id,
            notification_type: 'Report',
            title: 'Monthly Report Generated',
            message: `Your monthly business report for ${hostel.hostel_name} is now available in your email.`,
            priority: 'Low'
          });

        } catch (e) {
          console.error(`[Cron] Error generating monthly report for hostel ${hostel.hostel_id}:`, e);
        }
      }
      console.log(`[Cron] Generated monthly reports for ${hostels.length} active hostels.`);
    } catch (error) {
      console.error('[Cron] Error in monthly report job:', error);
    }
  });
};
