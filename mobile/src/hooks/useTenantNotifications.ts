/**
 * useTenantNotifications.ts
 *
 * Central notification helper for the Tenant app.
 *
 * Responsibilities:
 *  - Daily welcome / budget / expense-reminder toasts (once per calendar day)
 *  - Immediate action toasts: payment, complaint, expense, gate pass, growth
 *  - Badge refresh via DeviceEventEmitter after every action
 *  - All toasts call react-native-toast-message directly (same as ToastContext)
 *    so this module works both as a hook and as standalone exported helpers
 *    (action helpers are called from submit handlers, not from render)
 *  - Navigation helpers so every notification can deep-link to the correct screen
 *
 * Architecture:
 *  - Uses AsyncStorage for daily-guard keys (date strings: "YYYY-MM-DD")
 *  - Uses DeviceEventEmitter('REFRESH_NOTIFICATIONS') to trigger badge/list refresh
 *    in the existing useNotifications hook & NotificationsScreen
 *  - Does NOT call any owner-only APIs — tenant endpoints only
 */

import { useEffect, useCallback, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { notificationService } from '../services/notificationService';

// ── Storage keys for daily-guard ──────────────────────────────────────────────
const KEY_WELCOME  = 'tenant_welcome_date';
const KEY_BUDGET   = 'tenant_budget_notif_date';
const KEY_EXPENSE  = 'tenant_expense_notif_date';

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


// ── Low-level toast helper (wraps react-native-toast-message directly) ─────────
function showToast(
  type: 'success' | 'error' | 'warning' | 'info',
  title: string,
  message: string,
  duration = 3500,
) {
  Toast.show({
    type,
    text1: title,
    text2: message,
    visibilityTime: duration,
    autoHide: true,
    position: 'top',
    topOffset: 55,
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// ACTION NOTIFICATION HELPERS  (call these from screen submit handlers)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Call after a payment proof is successfully submitted.
 */
export function notifyPaymentSubmitted(amount?: number) {
  const amtStr = amount ? `₹${amount.toLocaleString('en-IN')} ` : '';
  const title = '✅ Payment Submitted';
  const body = `${amtStr}Payment proof submitted! Awaiting owner verification.`;
  showToast('success', title, body);
  notificationService.triggerLocalNotification(title, body, { screen: 'Dues', referenceType: 'payment' }).catch(() => {});
  emitRefresh();
}

/**
 * Call after a complaint is successfully raised.
 */
export function notifyComplaintRaised(title?: string) {
  const notifTitle = '🔧 Complaint Raised';
  const notifBody = title
    ? `"${title}" submitted. We'll get back to you soon.`
    : "Complaint submitted! We'll get back to you soon.";
  showToast('info', notifTitle, notifBody);
  notificationService.triggerLocalNotification(notifTitle, notifBody, { screen: 'Complaints', referenceType: 'complaint' }).catch(() => {});
  emitRefresh();
}

/**
 * Call after an expense is successfully added.
 */
export function notifyExpenseAdded(amount: number, category?: string) {
  const catStr = category ? ` to ${category}` : '';
  const title = '🎯 Expense Added';
  const body = `₹${amount.toLocaleString('en-IN')}${catStr} added to your tracker!`;
  showToast('success', title, body);
  notificationService.triggerLocalNotification(title, body, { screen: 'Expenses', referenceType: 'expense' }).catch(() => {});
  emitRefresh();
}

/**
 * Call after a budget is successfully set/updated.
 */
export function notifyBudgetSet(amount: number) {
  const title = '💰 Budget Set';
  const body = `Monthly budget of ₹${amount.toLocaleString('en-IN')} saved!`;
  showToast('success', title, body);
  notificationService.triggerLocalNotification(title, body, { screen: 'Expenses', referenceType: 'expense' }).catch(() => {});
  emitRefresh();
}

/**
 * Call after budget check: threshold exceeded
 * @param pct   - percentage used (0-100+)
 * @param budget - total budget amount
 * @param spent  - total amount spent
 */
export function notifyBudgetThreshold(pct: number, budget: number, spent: number) {
  if (pct >= 100) {
    const title = '🚨 Budget Exceeded!';
    const body = `You've exceeded your ₹${budget.toLocaleString('en-IN')} budget. ₹${spent.toLocaleString('en-IN')} spent.`;
    showToast('error', title, body, 5000);
    notificationService.triggerLocalNotification(title, body, { screen: 'Expenses', referenceType: 'expense' }).catch(() => {});
  } else if (pct >= 80) {
    const title = '⚠️ Budget Warning';
    const body = `You've used ${pct}% of your ₹${budget.toLocaleString('en-IN')} monthly budget.`;
    showToast('warning', title, body, 4500);
    notificationService.triggerLocalNotification(title, body, { screen: 'Expenses', referenceType: 'expense' }).catch(() => {});
  }
  emitRefresh();
}

/**
 * Call after gate pass is successfully submitted.
 */
export function notifyGatePassSubmitted() {
  const title = '🎟️ Gate Pass Submitted';
  const body = 'Your gate pass request has been submitted. Awaiting approval.';
  showToast('info', title, body);
  notificationService.triggerLocalNotification(title, body, { screen: 'GatePass', referenceType: 'leave' }).catch(() => {});
  emitRefresh();
}

/**
 * Call after visitor pass is successfully submitted.
 */
export function notifyVisitorPassSubmitted(visitorName?: string) {
  const title = '👥 Visitor Pass Submitted';
  const body = visitorName
    ? `Visitor pass for ${visitorName} has been submitted for approval.`
    : 'Your visitor pass request has been submitted. Awaiting approval.';
  showToast('info', title, body);
  notificationService.triggerLocalNotification(title, body, { screen: 'VisitorPass', referenceType: 'visitor' }).catch(() => {});
  emitRefresh();
}

/**
 * Call when gate pass is approved.
 */
export function notifyGatePassApproved() {
  const title = '✅ Gate Pass Approved';
  const body = "Your gate pass has been approved! You're good to go.";
  showToast('success', title, body);
  notificationService.triggerLocalNotification(title, body, { screen: 'GatePass', referenceType: 'leave' }).catch(() => {});
  emitRefresh();
}

/**
 * Call when gate pass is rejected.
 */
export function notifyGatePassRejected() {
  const title = '❌ Gate Pass Rejected';
  const body = 'Your gate pass request was rejected. Please check the details.';
  showToast('error', title, body, 5000);
  notificationService.triggerLocalNotification(title, body, { screen: 'GatePass', referenceType: 'leave' }).catch(() => {});
  emitRefresh();
}

/**
 * Call after Growth Journey story/lesson completion.
 */
export function notifyGrowthMilestoneCompleted(xpEarned?: number, levelTitle?: string) {
  const xpStr = xpEarned ? ` (+${xpEarned} XP)` : '';
  const titleStr = levelTitle ? `"${levelTitle}"` : 'a level';
  const title = '🎉 Milestone Completed!';
  const body = `Great job! You completed ${titleStr}${xpStr}. Keep going!`;
  showToast('success', title, body, 4500);
  notificationService.triggerLocalNotification(title, body, { screen: 'GrowthHome', referenceType: 'growth' }).catch(() => {});
  emitRefresh();
}

/**
 * Call when a new Growth Journey milestone/level becomes available.
 */
export function notifyGrowthNewMilestone() {
  const title = '🚀 New Milestone Available';
  const body = 'A new Growth Journey level is ready for you!';
  showToast('info', title, body);
  notificationService.triggerLocalNotification(title, body, { screen: 'GrowthHome', referenceType: 'growth' }).catch(() => {});
  emitRefresh();
}

/**
 * Call when Growth Journey streak/progress updates.
 */
export function notifyGrowthProgress(streak: number) {
  if (streak > 0 && streak % 5 === 0) {
    const title = '🔥 Streak Milestone!';
    const body = `Amazing! You're on a ${streak}-day learning streak. Keep it up!`;
    showToast('success', title, body, 4000);
    notificationService.triggerLocalNotification(title, body, { screen: 'GrowthHome', referenceType: 'growth' }).catch(() => {});
    emitRefresh();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// DAILY NOTIFICATION HOOK  (mount in TenantHomeScreen)
// ═════════════════════════════════════════════════════════════════════════════

interface UseTenantNotificationsOptions {
  userName?: string;
  budget?: number;
  spent?: number;
}

/**
 * Mount this hook in TenantHomeScreen.
 * Fires daily notifications at most once per calendar day.
 */
export function useTenantNotifications({
  userName,
  budget = 0,
  spent = 0,
}: UseTenantNotificationsOptions = {}) {
  const hasRun = useRef(false);

  const fireDailyNotifications = useCallback(async () => {
    if (hasRun.current) return;
    hasRun.current = true;

    const firstName = userName
      ? userName.split(' ')[0]
      : 'there';

    // ── 1. Budget notification (once/day, only when budget is set) ────────────
    if (budget > 0) {
      const showBudget = await shouldShowToday(KEY_BUDGET);
      if (showBudget) {
        const pct = Math.round((spent / budget) * 100);
        setTimeout(() => {
          if (pct >= 100) {
            showToast(
              'error',
              '🚨 Budget Exceeded!',
              `You've exceeded your ₹${budget.toLocaleString('en-IN')} budget this month.`,
              5000,
            );
          } else if (pct >= 80) {
            showToast(
              'warning',
              '⚠️ Budget Alert',
              `You've used ${pct}% of your ₹${budget.toLocaleString('en-IN')} monthly budget.`,
              4500,
            );
          } else if (budget > 0) {
            const remaining = budget - spent;
            showToast(
              'info',
              '💰 Budget Reminder',
              `You have ₹${remaining.toLocaleString('en-IN')} left from your ₹${budget.toLocaleString('en-IN')} budget today.`,
              4000,
            );
          }
        }, 3000);
        await markShownToday(KEY_BUDGET);
      }
    }

    // ── 3. Expense reminder (once/day, shown in evening hours) ───────────────
    const hour = new Date().getHours();
    // Show expense reminder from 6 PM onwards if not already shown
    if (hour >= 18) {
      const showExpense = await shouldShowToday(KEY_EXPENSE);
      if (showExpense) {
        setTimeout(() => {
          showToast(
            'info',
            '📝 Expense Reminder',
            'Don\'t forget to log today\'s expenses before the day ends!',
            4000,
          );
        }, 5000);
        await markShownToday(KEY_EXPENSE);
      }
    }
  }, [userName, budget, spent]);

  useEffect(() => {
    fireDailyNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ── Navigation target helper ──────────────────────────────────────────────────
// Maps notification types to the correct tenant screen name for tap navigation.
export function getTenantNavigationTarget(
  notificationType: string,
  referenceType?: string,
): { screen: string; params?: any } {
  const type = (notificationType || '').toLowerCase();
  const ref  = (referenceType || '').toLowerCase();

  // Payment related
  if (type.includes('payment') || type.includes('due') || type.includes('fee') || ref === 'payment') {
    return { screen: 'Dues' };
  }
  // Complaint related
  if (type.includes('complaint') || ref === 'complaint') {
    return { screen: 'Complaints' };
  }
  // Gate pass / leave request
  if (type.includes('gate') || type.includes('leave') || type.includes('pass') || ref === 'leave_request') {
    return { screen: 'GatePass' };
  }
  // Expense / budget related
  if (type.includes('expense') || type.includes('budget') || ref === 'expense') {
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
  return { screen: 'Home' };
}
