import cron from 'node-cron';
import db from '../config/database.js';
import { sendNotificationToStudent } from '../utils/notification.js';

/**
 * 30 Distinct, Engaging, Non-Repeating Daily Friendly Reminders
 * Rotated systematically by (dayOfMonth - 1) % 30
 */
const FRIENDLY_REMINDER_TEMPLATES: Array<{ title: string; message: string }> = [
  {
    title: 'Daily Spending Check ☕',
    message: 'Did you grab chai, snacks, or take a cab today? Log your expenses now in Hostix to keep your wallet happy!',
  },
  {
    title: 'Track Today, Save Tomorrow 💰',
    message: 'Small daily savings add up to big goals. Take 10 seconds to record today’s expenses!',
  },
  {
    title: 'Evening Pocket Check 🌙',
    message: 'Wrap up your day by logging today’s spending. Stay on top of your monthly money goals!',
  },
  {
    title: 'Smart Money Habits 🧠',
    message: 'Tracking every ₹10 brings you closer to your dream purchase. Log your transactions today!',
  },
  {
    title: 'Did You Spend Today? 🧾',
    message: 'Food delivery, groceries, or stationery? Tap here to add today’s expenses in one click.',
  },
  {
    title: 'Hostix Financial Tip 💡',
    message: 'Knowing where your money goes is the first step to financial freedom. Log your expenses today!',
  },
  {
    title: 'Quick Budget Check-In 📊',
    message: 'Take a quick peek at your monthly budget. Log today’s expenses and see where you stand!',
  },
  {
    title: 'Keep Your Streak Alive! 🔥',
    message: 'Consistent expense tracking builds great financial discipline. Don’t forget to log today!',
  },
  {
    title: 'Mid-Week Money Check 💳',
    message: 'How’s your wallet feeling? Keep your expense log clean and up to date with Hostix.',
  },
  {
    title: 'Your Future Self Will Thank You 🌟',
    message: 'Logging daily expenses prevents end-of-the-month surprises. Record what you spent today!',
  },
  {
    title: 'Where Did the Cash Go? 🧐',
    message: 'Keep an honest track of your daily cash & UPI spends. Log today’s purchases in seconds.',
  },
  {
    title: 'Hostix Expense Coach 🎯',
    message: 'Set a goal, track daily, celebrate savings! Log today’s expenses to stay in control.',
  },
  {
    title: 'Time for a 10-Second Log ⚡',
    message: 'Fast, simple, and satisfying. Tap to add today’s food, travel, and shopping expenses.',
  },
  {
    title: 'Weekend is Near! 🎉',
    message: 'Planning weekend plans? Log your weekday spending first to budget smartly for fun!',
  },
  {
    title: 'Smart Student, Smarter Spender 🎓',
    message: 'Managing student life is easier when your finances are organized. Log today’s spends now.',
  },
  {
    title: 'No Spend Day? Or Little Treat? 🍕',
    message: 'Whatever today looked like, keep your records accurate. Log your expenses in Hostix!',
  },
  {
    title: 'Master Your Pocket Money 💵',
    message: 'Make every rupee count this month. Check in and update your daily expense log.',
  },
  {
    title: 'Stay Ahead of Your Bills 📈',
    message: 'Track your daily groceries and recharges so you’re always prepared for rent and bills.',
  },
  {
    title: 'Hostix Daily Pocket Care ✨',
    message: 'A minute spent tracking saves hundreds at month-end. Log today’s spending right now.',
  },
  {
    title: 'Healthy Finances, Stress-Free Life 🧘',
    message: 'Zero guesswork about where your money went. Update your expense sheet today!',
  },
  {
    title: 'Take Control of Your UPI Spends 📲',
    message: 'UPI payments disappear fast! Capture today’s QR scans and transfers in your Hostix log.',
  },
  {
    title: 'Savings Challenge Alert 🏆',
    message: 'Can you stay under budget this week? Log today’s expenses to see your current score!',
  },
  {
    title: 'Nightly Finance Reflection 🌙',
    message: 'Before heading to sleep, log today’s expenditures to sleep with total peace of mind.',
  },
  {
    title: 'Build Wealth One Day at a Time 🏦',
    message: 'Financial independence starts with small daily habits. Log your expenses today!',
  },
  {
    title: 'You Got This! 💪',
    message: 'Keeping track of expenses is the superpower of every smart tenant. Log today’s spends now.',
  },
  {
    title: 'Hostix Budget Guardian 🛡️',
    message: 'Protect your monthly savings by keeping track of every daily snack and ride. Log now!',
  },
  {
    title: 'Track Spends in Under 5 Seconds ⏱️',
    message: 'One tap to record food, travel, or bills. Keep your Hostix expense diary up to date!',
  },
  {
    title: 'Clear Mind, Clear Budget 🌿',
    message: 'Avoid financial haze. Spend 15 seconds logging today’s expenses for crystal clear insights.',
  },
  {
    title: 'Almost Month-End! 🏁',
    message: 'Finish the month strong! Keep logging every spend to see your total monthly report.',
  },
  {
    title: 'Fresh Start with Smart Tracking 🚀',
    message: 'Every day is a fresh opportunity to save and grow. Log today’s expenses in Hostix!',
  },
];

/**
 * Runs daily friendly expense and budget check for all active tenants.
 */
export const runTenantFriendlyReminders = async () => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayOfMonth = today.getDate(); // 1 - 31
    const templateIndex = (dayOfMonth - 1) % FRIENDLY_REMINDER_TEMPLATES.length;
    const defaultTemplate = FRIENDLY_REMINDER_TEMPLATES[templateIndex];

    // Current month string 'YYYY-MM'
    const currentMonthStr = todayStr.substring(0, 7);

    // Fetch all active tenants
    const activeStudents = await db('students')
      .where('status', 1)
      .select('student_id', 'first_name', 'hostel_id');

    if (!activeStudents || activeStudents.length === 0) {
      console.log('[tenantFriendlyReminders] No active tenants to notify.');
      return { success: true, count: 0 };
    }

    let notifiedCount = 0;

    for (const student of activeStudents) {
      try {
        const studentId = student.student_id;

        // 1. Fetch tenant budget if set
        const budgetRow = await db('tenant_budgets')
          .where('student_id', studentId)
          .first()
          .catch(() => null);

        const monthlyBudget = Number(budgetRow?.amount || 0);

        // 2. Fetch today's total spending
        const todaySpendingRes = await db('tenant_expenses')
          .where('student_id', studentId)
          .whereRaw('DATE(date) = ?', [todayStr])
          .sum('amount as total')
          .first()
          .catch(() => null);

        const todaySpent = Number(todaySpendingRes?.total || 0);

        // 3. Fetch current month total spending
        const monthSpendingRes = await db('tenant_expenses')
          .where('student_id', studentId)
          .whereRaw('DATE_FORMAT(date, "%Y-%m") = ?', [currentMonthStr])
          .sum('amount as total')
          .first()
          .catch(() => null);

        const monthSpent = Number(monthSpendingRes?.total || 0);

        let title = defaultTemplate.title;
        let message = defaultTemplate.message;
        let priority: 'Low' | 'Medium' | 'High' = 'Low';

        // 4. If tenant has set a budget, customize with smart budget segregation
        if (monthlyBudget > 0) {
          const dailyBudgetLimit = Math.round(monthlyBudget / 30);

          if (monthSpent > monthlyBudget) {
            // Crossed monthly budget
            title = '⚠️ Monthly Budget Exceeded';
            message = `Hi ${student.first_name}, you’ve spent ₹${monthSpent.toLocaleString('en-IN')} of your ₹${monthlyBudget.toLocaleString('en-IN')} monthly budget. Tap to review your expenses.`;
            priority = 'High';
          } else if (todaySpent > dailyBudgetLimit * 1.5 && todaySpent > 300) {
            // High spending day
            title = '💸 Daily Spending Alert';
            message = `Hi ${student.first_name}, today’s spent ₹${todaySpent.toLocaleString('en-IN')} (daily budget: ~₹${dailyBudgetLimit.toLocaleString('en-IN')}). Log all items to keep your monthly plan on track!`;
            priority = 'Medium';
          } else if (todaySpent > 0) {
            // Normal spending logged today
            title = `Daily Expense: ₹${todaySpent.toLocaleString('en-IN')} Today 📊`;
            message = `You've logged ₹${todaySpent.toLocaleString('en-IN')} today. Total this month: ₹${monthSpent.toLocaleString('en-IN')} of ₹${monthlyBudget.toLocaleString('en-IN')} budget. Great job tracking!`;
            priority = 'Low';
          } else {
            // 0 spent logged today - prompt them
            title = defaultTemplate.title;
            message = `Hi ${student.first_name}! ${defaultTemplate.message} (Monthly budget: ₹${monthlyBudget.toLocaleString('en-IN')})`;
            priority = 'Low';
          }
        } else if (todaySpent > 0) {
          title = `Today's Spending: ₹${todaySpent.toLocaleString('en-IN')} 💳`;
          message = `You've recorded ₹${todaySpent.toLocaleString('en-IN')} in expenses today. Tap to add any remaining cash or UPI transactions!`;
          priority = 'Low';
        }

        await sendNotificationToStudent(
          studentId,
          monthlyBudget > 0 && monthSpent > monthlyBudget ? 'Budget Alert' : 'Expense Alert',
          title,
          message,
          priority,
          {
            todaySpent,
            monthSpent,
            monthlyBudget,
          },
          {
            screen: 'Expenses',
            params: { tab: 'expenses' },
            referenceType: 'tenant_expenses',
            referenceId: studentId,
            deduplicateKey: `daily_expense_rem_${studentId}_${todayStr}`,
          }
        );

        notifiedCount++;
      } catch (studentErr: any) {
        console.error(`[tenantFriendlyReminders] Failed for student ${student.student_id}:`, studentErr?.message);
      }
    }

    console.log(`[tenantFriendlyReminders] Dispatched friendly expense notifications to ${notifiedCount} tenants.`);
    return { success: true, count: notifiedCount };
  } catch (error: any) {
    console.error('[tenantFriendlyReminders] Error in job:', error?.message);
    return { success: false, error: error?.message };
  }
};

/**
 * Starts the cron schedule for tenant friendly reminders daily at 08:00 PM (20:00).
 */
export const startTenantFriendlyRemindersJob = () => {
  // Run daily at 08:00 PM
  const pattern = '0 20 * * *';
  const job = cron.schedule(pattern, () => {
    console.log('[Cron] Running daily tenant friendly expense reminders job (08:00 PM)...');
    runTenantFriendlyReminders().catch((e) =>
      console.error('[tenantFriendlyReminders] cron run failed:', e?.message)
    );
  });

  console.log('✓ Tenant friendly expense reminders job scheduled (daily 08:00 PM)');
  return job;
};

export default { runTenantFriendlyReminders, startTenantFriendlyRemindersJob };
