import cron from 'node-cron';
import db from '../config/database.js';
import { sendNotificationToHostelOwner, sendNotificationToStudent, sendNotificationToUser } from '../utils/notification.js';

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
const todayStr = () => new Date().toISOString().split('T')[0];

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
      
      // Notify Owner
      await sendNotificationToHostelOwner(
        s.hostel_id,
        'Vacate',
        'Upcoming Room Vacancy (3 Days) 🚪',
        `${s.room_number ? `Room ${s.room_number} — ` : ''}${name} is vacating on ${dateStr}. Check dues & prepare bed turnover.`,
        'Medium',
        { student_id: s.student_id, studentId: s.student_id },
        { screen: 'StudentDetails', params: { studentId: s.student_id }, referenceType: 'student', referenceId: s.student_id }
      ).catch((err) => console.error('[ownerDailyAlerts] vacancy notify owner failed:', err?.message));

      // Notify Tenant
      await sendNotificationToStudent(
        s.student_id,
        'Vacate',
        '⏳ 3 Days Left to Move Out',
        `Your scheduled move-out is in 3 days (${dateStr}). Contact management if you need to extend or verify settlement.`,
        'High',
        { student_id: s.student_id },
        { screen: 'VacateNotice', referenceType: 'vacate', referenceId: s.student_id }
      ).catch((err) => console.error('[ownerDailyAlerts] vacancy notify tenant failed:', err?.message));

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
        const dueTodayAmount = dueTodayList.reduce((sum: number, d: any) => sum + Number(d.balance || 0), 0);
        const pendingAmount = Number(totalPendingStats?.total || 0);
        const today = new Date().toISOString().split('T')[0];

        let message = '';
        if (dueTodayCount > 0 && dueTodayCount <= 2) {
          const names = dueTodayList.map((d: any) => d.first_name).join(' & ');
          message = `Good morning! ${names}'s rent is due today (₹${dueTodayAmount.toLocaleString('en-IN')}). ${overdueCount > 0 ? `${overdueCount} payment(s) overdue.` : ''}`.trim();
        } else if (dueTodayCount > 2) {
          message = `Good morning! ${dueTodayCount} rents are due today (₹${dueTodayAmount.toLocaleString('en-IN')}). ${overdueCount > 0 ? `${overdueCount} payment(s) overdue.` : ''}`.trim();
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
            { dueTodayCount, overdueCount, dueTodayAmount, pendingAmount },
            {
              screen: 'PendingTab',
              referenceType: 'dues_summary',
              referenceId: h.hostel_id,
              deduplicateKey: `daily_dues_summary_${h.hostel_id}_${today}`
            }
          );
          duesSummariesNotified++;
        }
      } catch (err: any) {
        console.error(`[ownerDailyAlerts] dues summary notify failed for hostel ${h.hostel_id}:`, err?.message);
      }
    }

    // 4. Pre-Booking Check-In Today Alert (students with status = 2 whose admission_date is today)
    let prebookingNotified = 0;
    try {
      const todayCheckins = await db('students as s')
        .where('s.status', 2)
        .whereRaw('DATE(s.admission_date) = CURDATE()')
        .select('s.student_id', 's.hostel_id', 's.first_name', 's.last_name', 's.admission_date');

      for (const p of todayCheckins) {
        const studentName = `${p.first_name}${p.last_name ? ' ' + p.last_name : ''}`.trim();
        await sendNotificationToHostelOwner(
          p.hostel_id,
          'PREBOOKING',
          'Pre-Booking Check-In Today 🔑',
          `${studentName} is scheduled to move in today. Tap to allocate bed and complete check-in.`,
          'High',
          { student_id: p.student_id },
          {
            screen: 'PreBooking',
            referenceType: 'student',
            referenceId: p.student_id,
            deduplicateKey: `prebooking_checkin_${p.student_id}_${new Date().toISOString().split('T')[0]}`
          }
        ).catch(() => {});
        prebookingNotified++;
      }
    } catch (pbErr: any) {
      console.error('[ownerDailyAlerts] prebooking checkin alert failed:', pbErr?.message);
    }

    // 5. Recurring Owner Expense Logging Reminder (1st, 5th, 10th, 20th of the month)
    const dayOfMonth = new Date().getDate();
    if (dayOfMonth === 1 || dayOfMonth === 5 || dayOfMonth === 10 || dayOfMonth === 20) {
      for (const h of hostels) {
        if (!h.hostel_id) continue;
        await sendNotificationToHostelOwner(
          h.hostel_id,
          'EXPENSE',
          'Track Hostel Expenses 🧾',
          'Don’t forget to record this month’s electricity, water, grocery, or maintenance bills in Hostix to see accurate net profit!',
          'Medium',
          { hostel_id: h.hostel_id },
          {
            screen: 'Expenses',
            referenceType: 'expense',
            deduplicateKey: `owner_expense_reminder_${h.hostel_id}_${dayOfMonth}`
          }
        ).catch(() => {});
      }
    }

    // 6. Onboarding & Inactivity Setup Nudges for Owners
    try {
      const recentOwners = await db('users')
        .where('role_id', 2)
        .where('is_active', 1)
        .whereRaw('created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)')
        .select('user_id', 'full_name', 'email', 'hostel_id');

      for (const owner of recentOwners) {
        // Check if owner has added any hostel
        const ownerHostels = await db('hostel_master').where('owner_id', owner.user_id);
        if (ownerHostels.length === 0) {
          await sendNotificationToUser({
            userId: owner.user_id,
            type: 'General',
            title: 'Complete Your Hostel Setup 🏨',
            message: `Hi ${(owner.full_name || 'Owner').split(' ')[0]}! Add your hostel details and address to start onboarding residents.`,
            priority: 'High',
            screen: 'AddHostel',
            deduplicateKey: `onboarding_no_hostel_${owner.user_id}_${dayOfMonth}`,
          }).catch(() => {});
          continue;
        }

        // For each hostel, check if rooms exist
        for (const h of ownerHostels) {
          const roomCountRes = await db('rooms').where('hostel_id', h.hostel_id).count('room_id as count').first();
          const roomCount = Number(roomCountRes?.count || 0);

          if (roomCount === 0) {
            await sendNotificationToHostelOwner(
              h.hostel_id,
              'General',
              'Setup Your Rooms & Beds 🛏️',
              `Your hostel "${h.hostel_name}" has no rooms configured yet. Add room types and bed capacity to begin admissions.`,
              'High',
              { hostel_id: h.hostel_id },
              {
                screen: 'AddRoom',
                referenceType: 'room',
                deduplicateKey: `onboarding_no_rooms_${h.hostel_id}_${dayOfMonth}`,
              }
            ).catch(() => {});
          } else {
            // Check if students exist
            const studentCountRes = await db('students')
              .where('hostel_id', h.hostel_id)
              .whereIn('status', [1, '1', 'Active'])
              .count('student_id as count')
              .first();
            const studentCount = Number(studentCountRes?.count || 0);

            if (studentCount === 0) {
              await sendNotificationToHostelOwner(
                h.hostel_id,
                'General',
                'Admit Your First Resident 👥',
                `Your rooms are set up! Add your first student or share your hostel code so residents can sign in.`,
                'Medium',
                { hostel_id: h.hostel_id },
                {
                  screen: 'AddStudent',
                  referenceType: 'student',
                  deduplicateKey: `onboarding_no_students_${h.hostel_id}_${dayOfMonth}`,
                }
              ).catch(() => {});
            }
          }
        }
      }
    } catch (onboardingErr: any) {
      console.error('[ownerDailyAlerts] onboarding nudge error:', onboardingErr?.message);
    }

    // 7. Weekly Rent Collections & Dues Review (Runs on Mondays, Fridays, or 1st/15th)
    const dayOfWeek = new Date().getDay(); // 1 = Monday, 5 = Friday
    if (dayOfWeek === 1 || dayOfWeek === 5 || dayOfMonth === 1 || dayOfMonth === 15) {
      for (const h of hostels) {
        if (!h.hostel_id) continue;
        try {
          // Calculate payments collected in the last 7 days
          const paymentsRes = await db('payments')
            .where('hostel_id', h.hostel_id)
            .whereRaw('payment_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)')
            .sum('amount as total_collected')
            .first();
          const totalCollected = Number(paymentsRes?.total_collected || 0);

          // Calculate current pending dues across active students
          const pendingRes = await db('monthly_fees as mf')
            .join('students as s', 'mf.student_id', 's.student_id')
            .where('mf.hostel_id', h.hostel_id)
            .where('s.status', 1)
            .where('mf.balance', '>', 0)
            .select(db.raw('COUNT(DISTINCT mf.student_id) as pending_count, SUM(mf.balance) as total_pending'))
            .first();

          const pendingCount = Number((pendingRes as any)?.pending_count || 0);
          const totalPending = Number((pendingRes as any)?.total_pending || 0);

          if (totalCollected > 0 || totalPending > 0) {
            const summaryTitle = totalCollected > 0 ? 'Weekly Collections Summary 💰' : 'Pending Rent Dues ⏳';
            const summaryMsg = totalCollected > 0
              ? `You collected ₹${totalCollected.toLocaleString('en-IN')} in the last 7 days. ${pendingCount > 0 ? `Pending dues: ₹${totalPending.toLocaleString('en-IN')} across ${pendingCount} tenant(s).` : 'All tenant dues are fully settled! 🎉'}`
              : `You have ₹${totalPending.toLocaleString('en-IN')} pending across ${pendingCount} tenant(s). Check your Pending Dues tab to collect rent.`;

            await sendNotificationToHostelOwner(
              h.hostel_id,
              'Payment Due',
              summaryTitle,
              summaryMsg,
              pendingCount > 0 ? 'High' : 'Medium',
              { hostel_id: h.hostel_id, collected: totalCollected, pending: totalPending },
              {
                screen: 'PendingPayments',
                referenceType: 'payment',
                deduplicateKey: `weekly_review_${h.hostel_id}_${todayStr()}`,
              }
            ).catch(() => {});
          } else {
            // Count active students to see if hostel is populated
            const activeRes = await db('students').where('hostel_id', h.hostel_id).where('status', 1).count('student_id as c').first();
            if (Number(activeRes?.c || 0) > 0) {
              await sendNotificationToHostelOwner(
                h.hostel_id,
                'General',
                'Hostel Rent Status: All Clear ✨',
                'All resident dues are up to date! Great job on rent collections this cycle.',
                'Low',
                { hostel_id: h.hostel_id },
                {
                  screen: 'Home',
                  referenceType: 'hostel',
                  deduplicateKey: `weekly_clear_${h.hostel_id}_${todayStr()}`,
                }
              ).catch(() => {});
            }
          }
        } catch (revErr: any) {
          console.error(`[ownerDailyAlerts] weekly review error for hostel ${h.hostel_id}:`, revErr?.message);
        }
      }
    }

    if (vacancyNotified > 0 || reminderNotified > 0 || duesSummariesNotified > 0 || prebookingNotified > 0) {
      console.log(`[ownerDailyAlerts] Notified ${vacancyNotified} upcoming vacancies, ${reminderNotified} reminders, ${duesSummariesNotified} dues summaries, ${prebookingNotified} pre-bookings`);
    }
    return { success: true, vacancyNotified, reminderNotified, duesSummariesNotified, prebookingNotified };
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
