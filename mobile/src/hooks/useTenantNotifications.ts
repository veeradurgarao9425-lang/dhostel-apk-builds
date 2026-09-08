/**
 * useTenantNotifications.ts
 *
 * Central notification helper for the Tenant app.
 *
 * Responsibilities:
 *  - Once-per-day Daily Welcome notification
 *  - 3-Time Daily Mess Menu alerts (Breakfast >7 AM, Lunch >12 PM, Dinner >7:30 PM)
 *  - Budget notification (Prompt to set if <= 0, daily status if > 0)
 *  - Nightly Pocket Check / Expense Reminder (>8:30 PM)
 *  - Growth Journey daily career booster (>4:00 PM)
 *  - Weekly Stay & App Feedback reminder (every 7 days)
 *  - Immediate action alerts: payment proof, complaints, expense added, vacate notice
 *  - Native outside tray notifications only — NO double toasts!
 *  - Navigation helpers so every notification deep-links to the exact screen
 */

import { useEffect, useCallback, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../services/notificationService';
import api from '../services/api';

// ── Storage keys for daily-guard ──────────────────────────────────────────────
const KEY_WELCOME         = 'tenant_welcome_date';
const KEY_BUDGET          = 'tenant_budget_notif_date';
const KEY_EXPENSE_NIGHT   = 'tenant_expense_notif_date';
const KEY_MESS_BREAKFAST  = 'tenant_mess_bf_date';
const KEY_MESS_LUNCH      = 'tenant_mess_lunch_date';
const KEY_MESS_DINNER     = 'tenant_mess_dinner_date';
const KEY_GROWTH          = 'tenant_growth_notif_date';
const KEY_LAST_FEEDBACK   = 'tenant_last_feedback_prompt_ts';

// ── Utility: today as YYYY-MM-DD ──────────────────────────────────────────────
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// ── Guard: returns true only if we haven't shown this notification today ───────
async function shouldShowToday(key: string): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored !== todayStr();
  } catch {
    return true;
  }
}

async function markShownToday(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, todayStr());
  } catch {}
}

// ── Emit badge/list refresh ───────────────────────────────────────────────────
function emitRefresh() {
  DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
}

// ═════════════════════════════════════════════════════════════════════════════
// ACTION NOTIFICATION HELPERS (Clean native notifications — NO ugly toasts!)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Call after a payment proof is successfully submitted.
 */
export function notifyPaymentSubmitted(amount?: number) {
  const amtStr = amount ? `₹${amount.toLocaleString('en-IN')} ` : '';
  const title = '✅ Payment Proof Submitted';
  const body = `${amtStr}Payment submitted! Awaiting owner verification. Receipt will be generated once verified.`;
  notificationService.triggerLocalNotification(title, body, { screen: 'Dues', referenceType: 'payment' }).catch(() => {});
  emitRefresh();
}

/**
 * Call after a complaint is successfully raised.
 */
export function notifyComplaintRaised(title?: string, category?: string) {
  const notifTitle = '🔧 Complaint Registered';
  let formattedSubject = 'Your complaint';
  if (title && /^\d+$/.test(title.trim())) {
    formattedSubject = `Complaint for Room #${title.trim()}`;
  } else if (title) {
    formattedSubject = `Complaint "${title.trim()}"`;
  } else if (category) {
    formattedSubject = `${category} complaint`;
  }

  const notifBody = `We received ${formattedSubject}. Our maintenance team will review it and get back to you shortly.`;
  notificationService.triggerLocalNotification(notifTitle, notifBody, { screen: 'Complaints', referenceType: 'complaint' }).catch(() => {});
  emitRefresh();
}

/**
 * Call after an expense is successfully added.
 */
export function notifyExpenseAdded(amount: number, category?: string) {
  const catStr = category ? ` to ${category}` : '';
  const title = '🎯 Expense Logged';
  const body = `₹${amount.toLocaleString('en-IN')}${catStr} added to your pocket tracker!`;
  notificationService.triggerLocalNotification(title, body, { screen: 'Expenses', referenceType: 'expense' }).catch(() => {});
  emitRefresh();
}

/**
 * Call after a budget is successfully set/updated.
 */
export function notifyBudgetSet(amount: number) {
  const title = '💰 Monthly Budget Saved';
  const body = `Monthly budget limit of ₹${amount.toLocaleString('en-IN')} is active. We'll help you track every rupee!`;
  notificationService.triggerLocalNotification(title, body, { screen: 'Expenses', referenceType: 'expense' }).catch(() => {});
  emitRefresh();
}

/**
 * Call after budget check: threshold exceeded
 */
export function notifyBudgetThreshold(pct: number, budget: number, spent: number) {
  const remaining = Math.max(0, budget - spent);
  if (pct >= 100) {
    const title = '🚨 Budget Exceeded!';
    const body = `You have spent ₹${spent.toLocaleString('en-IN')} of your ₹${budget.toLocaleString('en-IN')} budget. Slow down on discretionary spends!`;
    notificationService.triggerLocalNotification(title, body, { screen: 'Expenses', referenceType: 'expense' }).catch(() => {});
  } else if (pct >= 80) {
    const title = `⚠️ Budget Alert (${pct}% Used)`;
    const body = `You've used ₹${spent.toLocaleString('en-IN')} of your ₹${budget.toLocaleString('en-IN')} budget. Only ₹${remaining.toLocaleString('en-IN')} remaining.`;
    notificationService.triggerLocalNotification(title, body, { screen: 'Expenses', referenceType: 'expense' }).catch(() => {});
  }
  emitRefresh();
}

/**
 * Call after vacate notice is submitted.
 */
export function notifyVacateNoticeSubmitted(vacateDate: string, refundAmount?: number) {
  const title = '📦 Vacate Notice Scheduled';
  const refundStr = refundAmount ? ` Estimated deposit refund: ₹${refundAmount.toLocaleString('en-IN')}.` : '';
  const body = `Your room move-out is scheduled for ${vacateDate}.${refundStr} Management has been notified.`;
  notificationService.triggerLocalNotification(title, body, { screen: 'VacateNotice', referenceType: 'vacate' }).catch(() => {});
  emitRefresh();
}

/**
 * Call after Growth Journey milestone/lesson completion.
 */
export function notifyGrowthMilestoneCompleted(xpEarned?: number, levelTitle?: string) {
  const xpStr = xpEarned ? ` (+${xpEarned} XP)` : '';
  const titleStr = levelTitle ? `"${levelTitle}"` : 'Stage';
  const title = '🎉 Milestone Completed!';
  const body = `Great job! You crushed ${titleStr}${xpStr}. Keep your daily learning streak alive!`;
  notificationService.triggerLocalNotification(title, body, { screen: 'GrowthHome', referenceType: 'growth' }).catch(() => {});
  emitRefresh();
}

/**
 * Call when Growth Journey streak updates.
 */
export function notifyGrowthProgress(streak: number) {
  if (streak > 0 && streak % 5 === 0) {
    const title = '🔥 Streak Milestone!';
    const body = `Amazing! You're on a ${streak}-day learning streak. Keep it up!`;
    notificationService.triggerLocalNotification(title, body, { screen: 'GrowthHome', referenceType: 'growth' }).catch(() => {});
    emitRefresh();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// DAILY NOTIFICATION HOOK (Mounts in TenantHomeScreen)
// ═════════════════════════════════════════════════════════════════════════════

interface UseTenantNotificationsOptions {
  userName?: string;
  budget?: number;
  spent?: number;
  hostelId?: number | null;
  isDataLoaded?: boolean;
}

/**
 * Mount this hook in TenantHomeScreen.
 * Controls the daily outside push notification schedule.
 */
export function useTenantNotifications({
  userName,
  budget = 0,
  spent = 0,
  hostelId,
  isDataLoaded = true,
}: UseTenantNotificationsOptions = {}) {
  const hasRun = useRef(false);

  const fireDailyNotifications = useCallback(async () => {
    if (!isDataLoaded) return;
    if (hasRun.current) return;
    hasRun.current = true;

    const firstName = userName ? userName.split(' ')[0] : 'there';
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeInHours = hour + minute / 60;

    // ── 1. Daily Welcome Notification (STRICTLY ONCE PER CALENDAR DAY) ────────
    const showWelcome = await shouldShowToday(KEY_WELCOME);
    if (showWelcome) {
      setTimeout(() => {
        notificationService.triggerLocalNotification(
          `Welcome back, ${firstName}! 👋`,
          `Your hostel dashboard is ready. Rent status, today's food menu & pocket expense tracker at your fingertips.`,
          { screen: 'TenantHome', referenceType: 'welcome' }
        ).catch(() => {});
      }, 1500);
      await markShownToday(KEY_WELCOME);
    }

    // ── 2. Daily Mess Menu Notifications (3 Times Daily with food items) ─────
    try {
      if (hostelId) {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const todayFull = dayNames[now.getDay()];

        // Helper to fetch today's meal
        const fetchMealItems = async (mealType: string): Promise<string | null> => {
          try {
            const res = await api.get(`/mess-menu/${hostelId}`);
            const rows: any[] = res.data?.menu || res.data?.data || [];
            const todayRows = rows.filter(
              (m: any) =>
                m.day_of_week?.trim().toLowerCase() === todayFull.toLowerCase() ||
                m.day_of_week?.trim().toLowerCase() === todayFull.substring(0, 3).toLowerCase()
            );
            const found = todayRows.find((m: any) => m.meal_type?.trim().toLowerCase() === mealType.toLowerCase());
            return found?.items && found.items !== 'Menu not updated' ? found.items : null;
          } catch {
            return null;
          }
        };

        // Morning Breakfast (> 7:00 AM & < 11:30 AM)
        if (timeInHours >= 7.0 && timeInHours < 11.5) {
          const showBreakfast = await shouldShowToday(KEY_MESS_BREAKFAST);
          if (showBreakfast) {
            const items = await fetchMealItems('breakfast');
            const itemsText = items ? `${items}` : 'Breakfast is ready in the dining hall';
            setTimeout(() => {
              notificationService.triggerLocalNotification(
                `🍳 Today's Breakfast is Ready! 🎉`,
                `${itemsText}. Served 8:00 AM – 10:00 AM. Tap to view today's complete mess menu!`,
                { screen: 'FullMenu', referenceType: 'food' }
              ).catch(() => {});
            }, 3000);
            await markShownToday(KEY_MESS_BREAKFAST);
          }
        }

        // Afternoon Lunch (> 12:00 PM & < 15:30 PM)
        if (timeInHours >= 12.0 && timeInHours < 15.5) {
          const showLunch = await shouldShowToday(KEY_MESS_LUNCH);
          if (showLunch) {
            const items = await fetchMealItems('lunch');
            const itemsText = items ? `${items}` : 'Hot lunch is being served';
            setTimeout(() => {
              notificationService.triggerLocalNotification(
                `🍲 What's for Lunch Today?`,
                `${itemsText}. Served in the dining hall until 2:30 PM. Enjoy your meal!`,
                { screen: 'FullMenu', referenceType: 'food' }
              ).catch(() => {});
            }, 3000);
            await markShownToday(KEY_MESS_LUNCH);
          }
        }

        // Evening / Dinner (> 19:30 PM)
        if (timeInHours >= 19.5) {
          const showDinner = await shouldShowToday(KEY_MESS_DINNER);
          if (showDinner) {
            const items = await fetchMealItems('dinner');
            const itemsText = items ? `${items}` : 'Delicious dinner is being served';
            setTimeout(() => {
              notificationService.triggerLocalNotification(
                `🍛 Tonight's Dinner Menu`,
                `${itemsText}. Served from 8:00 PM – 10:00 PM. Don't miss tonight's dinner!`,
                { screen: 'FullMenu', referenceType: 'food' }
              ).catch(() => {});
            }, 3000);
            await markShownToday(KEY_MESS_DINNER);
          }
        }
      }
    } catch {}

    // ── 3. Budget Notification (Once/day) ────────────────────────────────────
    const showBudget = await shouldShowToday(KEY_BUDGET);
    if (showBudget) {
      if (budget <= 0) {
        // Budget NOT set — encourage tenant to set one
        setTimeout(() => {
          notificationService.triggerLocalNotification(
            `💡 Set Your Monthly Budget`,
            `Take 10 seconds to set your monthly budget limit so you never run out of money before month-end!`,
            { screen: 'Expenses', referenceType: 'expense' }
          ).catch(() => {});
        }, 4500);
        await markShownToday(KEY_BUDGET);
      } else {
        // Budget is set — inform daily status
        const pct = Math.round((spent / budget) * 100);
        const remaining = Math.max(0, budget - spent);
        if (pct >= 100) {
          setTimeout(() => {
            notificationService.triggerLocalNotification(
              `🚨 Budget Exceeded!`,
              `You've spent ₹${spent.toLocaleString('en-IN')} of your ₹${budget.toLocaleString('en-IN')} budget this month.`,
              { screen: 'Expenses', referenceType: 'expense' }
            ).catch(() => {});
          }, 4500);
        } else if (pct >= 80) {
          setTimeout(() => {
            notificationService.triggerLocalNotification(
              `⚠️ Budget Alert (${pct}% Used)`,
              `You have ₹${remaining.toLocaleString('en-IN')} left from your ₹${budget.toLocaleString('en-IN')} monthly budget.`,
              { screen: 'Expenses', referenceType: 'expense' }
            ).catch(() => {});
          }, 4500);
        } else {
          setTimeout(() => {
            notificationService.triggerLocalNotification(
              `💰 Daily Budget Status`,
              `You have ₹${remaining.toLocaleString('en-IN')} left from your ₹${budget.toLocaleString('en-IN')} monthly budget today.`,
              { screen: 'Expenses', referenceType: 'expense' }
            ).catch(() => {});
          }, 4500);
        }
        await markShownToday(KEY_BUDGET);
      }
    }

    // ── 4. Growth Journey Daily Career Boost (Afternoon > 16:00 PM) ──────────
    if (timeInHours >= 16.0 && timeInHours < 19.5) {
      const showGrowth = await shouldShowToday(KEY_GROWTH);
      if (showGrowth) {
        setTimeout(() => {
          notificationService.triggerLocalNotification(
            `🚀 Free 2 Minutes? Quick Career Boost`,
            `Learn 3 new English interview words & keep your learning streak alive. Tap to play!`,
            { screen: 'GrowthHome', referenceType: 'growth' }
          ).catch(() => {});
        }, 5000);
        await markShownToday(KEY_GROWTH);
      }
    }

    // ── 5. Nightly 10-Second Pocket Check (> 20:30 PM) ───────────────────────
    if (timeInHours >= 20.5) {
      const showExpense = await shouldShowToday(KEY_EXPENSE_NIGHT);
      if (showExpense) {
        setTimeout(() => {
          notificationService.triggerLocalNotification(
            `🌙 10-Second Pocket Check`,
            `Did you spend on chai, auto, or snacks today? Log today's cash & UPI spends to keep your wallet safe.`,
            { screen: 'Expenses', referenceType: 'expense' }
          ).catch(() => {});
        }, 5000);
        await markShownToday(KEY_EXPENSE_NIGHT);
      }
    }

    // ── 6. Weekly App & Stay Feedback (Every 7 days) ─────────────────────────
    try {
      const lastFeedbackPrompt = await AsyncStorage.getItem(KEY_LAST_FEEDBACK);
      const nowTs = Date.now();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      if (!lastFeedbackPrompt || nowTs - Number(lastFeedbackPrompt) > SEVEN_DAYS_MS) {
        setTimeout(() => {
          notificationService.triggerLocalNotification(
            `💬 How is your hostel stay?`,
            `Tell us what we can improve in your room, mess food, or the app. Share quick feedback!`,
            { screen: 'Feedback', referenceType: 'feedback' }
          ).catch(() => {});
        }, 7000);
        await AsyncStorage.setItem(KEY_LAST_FEEDBACK, String(nowTs));
      }
    } catch {}

  }, [userName, budget, spent, hostelId, isDataLoaded]);

  useEffect(() => {
    fireDailyNotifications();
  }, [fireDailyNotifications]);
}

// ── Navigation target helper ──────────────────────────────────────────────────
// Maps notification types to the correct tenant screen name for tap navigation.
export function getTenantNavigationTarget(
  notificationType: string,
  referenceType?: string,
): { screen: string; params?: any } {
  const type = (notificationType || '').toLowerCase();
  const ref  = (referenceType || '').toLowerCase();

  // Payment / Rent related
  if (type.includes('payment') || type.includes('due') || type.includes('fee') || ref === 'payment' || ref === 'monthly_fee') {
    return { screen: 'Dues' };
  }
  // Food / Mess menu
  if (type.includes('food') || type.includes('mess') || type.includes('breakfast') || type.includes('lunch') || type.includes('dinner') || ref === 'food') {
    return { screen: 'FullMenu' };
  }
  // Vacate notice
  if (type.includes('vacate') || ref === 'vacate') {
    return { screen: 'VacateNotice' };
  }
  // Complaint related
  if (type.includes('complaint') || ref === 'complaint') {
    return { screen: 'Complaints' };
  }
  // Feedback / suggestions
  if (type.includes('feedback') || type.includes('review') || type.includes('rate') || ref === 'feedback') {
    return { screen: 'Feedback' };
  }
  // Expense / budget related
  if (type.includes('expense') || type.includes('budget') || ref === 'expense' || ref === 'tenant_expenses') {
    return { screen: 'Expenses' };
  }
  // Growth Journey related
  if (type.includes('growth') || type.includes('milestone') || type.includes('streak') || ref === 'growth') {
    return { screen: 'GrowthHome' };
  }
  // Notice
  if (type.includes('notice') || ref === 'notice') {
    return { screen: 'Notices' };
  }
  // Welcome / general → Home
  return { screen: 'TenantHome' };
}

export const notifyGatePassSubmitted = () => {
  notificationService.triggerLocalNotification(
    'Gate Pass Request Submitted 🎫',
    'Your leave request was sent to the hostel owner for approval.',
    { screen: 'GatePass' }
  ).catch(() => {});
};

export const notifyVisitorPassSubmitted = (visitorName?: string) => {
  notificationService.triggerLocalNotification(
    'Visitor Pass Submitted 👤',
    visitorName
      ? `Pass requested for ${visitorName}. Waiting for owner approval.`
      : 'Your visitor request was sent to the hostel owner for approval.',
    { screen: 'VisitorPass' }
  ).catch(() => {});
};

