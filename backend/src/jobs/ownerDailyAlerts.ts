import cron from 'node-cron';
import db from '../config/database.js';
import { sendNotificationToHostelOwner, sendNotificationToStudent, sendNotificationToUser } from '../utils/notification.js';
import { IST_TZ, istToday, istAddDays, istDayOfMonth, istMonthStart, inr } from '../utils/istTime.js';

/**
 * Owner-facing morning jobs (all times IST):
 *
 * 1. Vacate countdown — EVERY day from VACATE_COUNTDOWN_DAYS before a tenant's
 *    vacate_notice_date until they are checked out, the owner (and tenant) are
 *    told how many days are left ("2 days left"), and "should have vacated"
 *    once the date has passed.
 * 2. Personal reminders — the owner's own `reminders` list.
 * 3. Morning status digest (07:05) — pending / partial / overdue fees, upcoming
 *    vacates, open complaints, pending registrations, free-trial days left.
 *    When everything is clear it invites the owner to review this month's
 *    income and expenses instead.
 */

const VACATE_COUNTDOWN_DAYS = 7;

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
  try { return await p; } catch (e: any) {
    console.error('[ownerDailyAlerts] stat query failed:', e?.message);
    return fallback;
  }
};

const dateOnly = (v: any): string => {
  if (typeof v === 'string') return v.slice(0, 10);
  const d = new Date(v);
  // DATE columns come back as local-midnight Dates; format with local parts to avoid UTC shift
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const daysBetween = (fromStr: string, toStr: string): number => {
  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
};

/** Build and send the morning status digest for one hostel. */
export const sendMorningDigest = async (h: any, today: string, force = false): Promise<boolean> => {
  const hid = h.hostel_id;
  const in7 = istAddDays(7);

  const feeBase = () =>
    db('monthly_fees as mf')
      .join('students as s', 'mf.student_id', 's.student_id')
      .where('mf.hostel_id', hid)
      .whereIn('s.status', [1, '1', 'Active'])
      .where('mf.balance', '>', 0)
      .whereNot('mf.fee_status', 'Fully Paid');

  const agg = (q: any) => q.count('* as c').sum('mf.balance as t').first();

  const [overdue, partial, pending, dueSoon, dueToday] = await Promise.all([
    safe(agg(feeBase().where('mf.due_date', '<', today)), null as any),
    safe(agg(feeBase().where('mf.due_date', '>=', today).where('mf.fee_status', 'Partially Paid')), null as any),
    safe(agg(feeBase().where('mf.due_date', '>=', today).whereNot('mf.fee_status', 'Partially Paid')), null as any),
    safe(agg(feeBase().whereBetween('mf.due_date', [today, in7])), null as any),
    safe(agg(feeBase().where('mf.due_date', today)), null as any),
  ]);

  const n = (r: any) => Number(r?.c || 0);
  const amt = (r: any) => Number(r?.t || 0);

  const vacating: any = await safe(
    db('students')
      .where('hostel_id', hid)
      .whereIn('status', [1, '1', 'Active'])
      .whereNotNull('vacate_notice_date')
      .where('vacate_notice_date', '<=', in7)
      .count('student_id as c')
      .first() as any,
    null
  );

  const openComplaints: any = await safe(
    db('complaints').where('hostel_id', hid).whereIn('status', ['Open', 'In Progress']).count('* as c').first() as any,
    null
  );

  const pendingRegs: any = await safe(
    db('students').where('hostel_id', hid).whereIn('status', [3, '3']).count('student_id as c').first() as any,
    null
  );

  const lines: string[] = [];
  if (n(overdue) > 0) lines.push(`🔴 ${n(overdue)} overdue (${inr(amt(overdue))})`);
  if (n(dueToday) > 0) lines.push(`📅 ${n(dueToday)} due today (${inr(amt(dueToday))})`);
  if (n(partial) > 0) lines.push(`🟠 ${n(partial)} partially paid (${inr(amt(partial))} left)`);
  if (n(pending) > 0) lines.push(`⏳ ${n(pending)} pending (${inr(amt(pending))})`);
  if (n(dueSoon) > 0) lines.push(`🗓️ ${n(dueSoon)} falling due in 7 days`);
  if (n(vacating) > 0) lines.push(`🚪 ${plural(n(vacating), 'tenant')} vacating within 7 days`);
  if (n(openComplaints) > 0) lines.push(`🛠️ ${plural(n(openComplaints), 'open complaint')}`);
  if (n(pendingRegs) > 0) lines.push(`📝 ${plural(n(pendingRegs), 'registration')} awaiting approval`);

  // Free-trial countdown
  let trialLine = '';
  if (Number(h.subscription_status_id) === 1 && h.trial_end_date) {
    const left = daysBetween(today, dateOnly(h.trial_end_date));
    if (left >= 0 && left <= 30) trialLine = left === 0 ? '⚠️ Free trial ends today — subscribe to keep access.' : `🎁 Free trial: ${plural(left, 'day')} left.`;
  }

  let title: string;
  let message: string;
  let screen: string;
  let priority: 'Low' | 'Medium' | 'High' = 'Medium';
  let params: Record<string, any> | undefined;

  if (lines.length > 0) {
    title = n(overdue) > 0 ? `☀️ Good morning — ${n(overdue)} overdue, action needed` : '☀️ Good morning — hostel status';
    message = lines.join('\n');
    if (trialLine) message += `\n${trialLine}`;
    screen = n(overdue) > 0 || n(pending) > 0 || n(partial) > 0 || n(dueToday) > 0 ? 'PendingPayments' : 'Home';
    params = n(overdue) > 0 ? { tab: 'Overdue' } : undefined;
    priority = n(overdue) > 0 || n(dueToday) > 0 ? 'High' : 'Medium';
  } else {
    const monthStart = istMonthStart();
    const collected: any = await safe(
      db('fee_payments').where('hostel_id', hid).where('payment_date', '>=', monthStart).sum('amount as t').first() as any,
      null
    );
    const spent: any = await safe(
      db('expenses').where('hostel_id', hid).where('expense_date', '>=', monthStart).sum('amount as t').first() as any,
      null
    );
    title = '✨ All clear this morning!';
    message =
      `No pending or overdue fees. This month: ${inr(amt(collected))} collected, ${inr(amt(spent))} expenses. ` +
      `Come check this month's income & expenses and keep your books up to date.`;
    if (trialLine) message += `\n${trialLine}`;
    screen = 'Expenses';
    priority = 'Low';
  }

  await sendNotificationToHostelOwner(
    hid,
    'System Alert',
    title,
    message,
    priority,
    { overdue: n(overdue), pending: n(pending), partial: n(partial), dueToday: n(dueToday) },
    {
      screen,
      params,
      referenceType: 'morning_digest',
      referenceId: hid,
      deduplicateKey: force ? undefined : `owner_morning_digest_${hid}_${today}`,
    }
  );
  return true;
};

export const runOwnerDailyAlerts = async () => {
  try {
    const today = istToday();
    const dayOfMonth = istDayOfMonth();

    // 1. Vacate countdown — every day until the tenant has left
    const upcomingVacancies = await db('students as s')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .whereNotNull('s.vacate_notice_date')
      .whereIn('s.status', [1, '1', 'Active'])
      .where('s.vacate_notice_date', '<=', istAddDays(VACATE_COUNTDOWN_DAYS))
      .select('s.student_id', 's.hostel_id', 's.first_name', 's.last_name', 's.vacate_notice_date', 'r.room_number');

    let vacancyNotified = 0;
    for (const s of upcomingVacancies) {
      const name = `${s.first_name}${s.last_name ? ' ' + s.last_name : ''}`.trim();
      const dateStr = dateOnly(s.vacate_notice_date);
      const daysLeft = daysBetween(today, dateStr);
      const room = s.room_number ? `Room ${s.room_number} — ` : '';

      let ownerTitle: string;
      let ownerMsg: string;
      let tenantTitle: string;
      let tenantMsg: string;
      if (daysLeft < 0) {
        ownerTitle = `⚠️ ${name} still not checked out`;
        ownerMsg = `${room}${name}'s vacate date (${dateStr}) was ${plural(-daysLeft, 'day')} ago. Complete the settlement and check-out.`;
        tenantTitle = 'Move-out date has passed';
        tenantMsg = `Your move-out date (${dateStr}) has passed. Please complete settlement and hand over the bed.`;
      } else if (daysLeft === 0) {
        ownerTitle = `🚪 ${name} vacates TODAY`;
        ownerMsg = `${room}${name} is vacating today. Check dues, deposit refund and bed handover.`;
        tenantTitle = '🚪 Move-out day';
        tenantMsg = 'Today is your move-out date. Please clear any dues and complete the handover.';
      } else {
        ownerTitle = `🚪 ${name} vacates in ${plural(daysLeft, 'day')}`;
        ownerMsg = `${room}${name} is vacating on ${dateStr} (${plural(daysLeft, 'day')} left). Please check dues and prepare bed turnover.`;
        tenantTitle = `⏳ ${plural(daysLeft, 'day')} left to move out`;
        tenantMsg = `Your scheduled move-out is on ${dateStr}. Please clear dues and contact management for settlement.`;
      }

      await sendNotificationToHostelOwner(
        s.hostel_id,
        'Vacate',
        ownerTitle,
        ownerMsg,
        daysLeft <= 2 ? 'High' : 'Medium',
        { student_id: s.student_id, studentId: s.student_id, daysLeft },
        {
          screen: 'StudentDetails',
          params: { studentId: s.student_id },
          referenceType: 'student',
          referenceId: s.student_id,
          deduplicateKey: `vacate_owner_${s.student_id}_${today}`,
        }
      ).catch((err) => console.error('[ownerDailyAlerts] vacancy notify owner failed:', err?.message));

      await sendNotificationToStudent(
        s.student_id,
        'Vacate',
        tenantTitle,
        tenantMsg,
        'High',
        { student_id: s.student_id },
        { screen: 'VacateNotice', referenceType: 'vacate', referenceId: s.student_id, deduplicateKey: `vacate_tenant_${s.student_id}_${today}` }
      ).catch((err) => console.error('[ownerDailyAlerts] vacancy notify tenant failed:', err?.message));

      vacancyNotified++;
    }

    // 2. Personal reminders
    const dueReminders = await db('reminders')
      .where('reminder_date', today)
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

    // 3. Morning status digest (active hostels; expired-subscription hostels are skipped)
    const hostels = await db('hostel_master').where('is_active', 1);
    let duesSummariesNotified = 0;
    for (const h of hostels) {
      if (!h.hostel_id) continue;
      try {
        if (await sendMorningDigest(h, today)) duesSummariesNotified++;
      } catch (err: any) {
        console.error(`[ownerDailyAlerts] morning digest failed for hostel ${h.hostel_id}:`, err?.message);
      }
    }

    // 4. Pre-Booking Check-In Today Alert
    let prebookingNotified = 0;
    try {
      const todayCheckins = await db('students as s')
        .where('s.status', 2)
        .whereRaw('DATE(s.admission_date) = ?', [today])
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
            deduplicateKey: `prebooking_checkin_${p.student_id}_${today}`
          }
        ).catch(() => {});
        prebookingNotified++;
      }
    } catch (pbErr: any) {
      console.error('[ownerDailyAlerts] prebooking checkin alert failed:', pbErr?.message);
    }

    // 5. Recurring Owner Expense Logging Reminder (1st, 5th, 10th, 20th of the month)
    if ([1, 5, 10, 20].includes(dayOfMonth)) {
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
            deduplicateKey: `owner_expense_reminder_${h.hostel_id}_${today}`
          }
        ).catch(() => {});
      }
    }

    // 6. Onboarding & Inactivity Setup Nudges for Owners (first 30 days)
    try {
      const recentOwners = await db('users')
        .where('role_id', 2)
        .where('is_active', 1)
        .whereRaw('created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)')
        .select('user_id', 'full_name', 'email', 'hostel_id');

      for (const owner of recentOwners) {
        const ownerHostels = await db('hostel_master').where('owner_id', owner.user_id);
        if (ownerHostels.length === 0) {
          await sendNotificationToUser({
            userId: owner.user_id,
            type: 'General',
            title: 'Complete Your Hostel Setup 🏨',
            message: `Hi ${(owner.full_name || 'Owner').split(' ')[0]}! Add your hostel details and address to start onboarding residents.`,
            priority: 'High',
            screen: 'AddHostel',
            deduplicateKey: `onboarding_no_hostel_${owner.user_id}_${today}`,
          }).catch(() => {});
          continue;
        }

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
              { screen: 'AddRoom', referenceType: 'room', deduplicateKey: `onboarding_no_rooms_${h.hostel_id}_${today}` }
            ).catch(() => {});
          } else {
            const studentCountRes = await db('students')
              .where('hostel_id', h.hostel_id)
              .whereIn('status', [1, '1', 'Active'])
              .count('student_id as count')
              .first();
            if (Number(studentCountRes?.count || 0) === 0) {
              await sendNotificationToHostelOwner(
                h.hostel_id,
                'General',
                'Admit Your First Resident 👥',
                `Your rooms are set up! Add your first student or share your hostel code so residents can sign in.`,
                'Medium',
                { hostel_id: h.hostel_id },
                { screen: 'AddStudent', referenceType: 'student', deduplicateKey: `onboarding_no_students_${h.hostel_id}_${today}` }
              ).catch(() => {});
            }
          }
        }
      }
    } catch (onboardingErr: any) {
      console.error('[ownerDailyAlerts] onboarding nudge error:', onboardingErr?.message);
    }

    // 7. Housekeeping: drop device tokens not refreshed in 180 days (apps re-register on every
    //    launch; long-idle users must keep getting "come back" pushes, so the cutoff is generous —
    //    FCM itself invalidates tokens after ~270 idle days).
    try {
      const removed = await db('user_push_tokens').whereRaw('updated_at < DATE_SUB(NOW(), INTERVAL 180 DAY)').del();
      if (removed > 0) console.log(`[ownerDailyAlerts] Removed ${removed} stale push token(s)`);
    } catch (_) { /* table/column variance — non-critical */ }

    console.log(`[ownerDailyAlerts] ${today} IST: ${vacancyNotified} vacate countdowns, ${reminderNotified} reminders, ${duesSummariesNotified} morning digests, ${prebookingNotified} pre-bookings`);
    return { success: true, vacancyNotified, reminderNotified, duesSummariesNotified, prebookingNotified };
  } catch (error: any) {
    console.error('[ownerDailyAlerts] Error:', error?.message);
    return { success: false, error: error?.message };
  }
};

export const startOwnerDailyAlertsJob = () => {
  // Every morning at 07:05 AM IST
  const job = cron.schedule(
    '5 7 * * *',
    () => {
      runOwnerDailyAlerts().catch((e) => console.error('[ownerDailyAlerts] cron run failed:', e?.message));
    },
    { timezone: IST_TZ }
  );

  // Catch-up: if the server was down/redeploying at 07:05, still send this morning's digest
  // (per-day dedupe keys make a repeat run harmless). Only in the morning window.
  setTimeout(() => {
    const hourIST = Number(new Intl.DateTimeFormat('en-GB', { timeZone: IST_TZ, hour: '2-digit', hour12: false }).format(new Date()));
    if (hourIST >= 7 && hourIST < 13) {
      console.log('[ownerDailyAlerts] Startup catch-up for this morning');
      runOwnerDailyAlerts().catch((e) => console.error('[ownerDailyAlerts] startup catch-up failed:', e?.message));
    }
  }, 30000);

  console.log('✓ Owner daily alerts job scheduled (daily 07:05 AM IST + startup catch-up)');
  return job;
};
