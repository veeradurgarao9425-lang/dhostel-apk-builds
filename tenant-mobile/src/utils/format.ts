/** Small shared formatting + due-date helpers used across screens. */

export const formatCurrency = (value?: number | null) =>
  `₹${Number(value || 0).toLocaleString('en-IN')}`;

export const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Whole days from today until `value` (negative = overdue, 0 = today). */
export const daysUntil = (value?: string | null): number | null => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((a - b) / 86_400_000);
};

/** Human "5 days ago" / "in 3 days" style label from an ISO date. */
export const relativeDay = (value?: string | null): string => {
  const n = daysUntil(value);
  if (n === null) return '';
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 0) return `In ${n} days`;
  return `${Math.abs(n)} days ago`;
};

export type DueStatus = {
  tone: 'success' | 'warning' | 'danger';
  label: string;
  /** True when due falls inside the 7-day reminder window (or already overdue). */
  reminder: boolean;
  daysLeft: number | null;
};

/**
 * Core of the app's value proposition: turn outstanding due + next due date
 * into a status the UI (and a local notification) can act on. Anything within
 * the next 7 days — or already overdue — flips on the reminder.
 */
export const getDueStatus = (
  outstanding?: number | null,
  nextDueDate?: string | null,
): DueStatus => {
  const amount = Number(outstanding || 0);
  if (amount <= 0) {
    return { tone: 'success', label: 'All clear', reminder: false, daysLeft: null };
  }
  const n = daysUntil(nextDueDate);
  if (n === null) {
    return { tone: 'warning', label: 'Payment pending', reminder: true, daysLeft: null };
  }
  if (n < 0) {
    return { tone: 'danger', label: `Overdue by ${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'}`, reminder: true, daysLeft: n };
  }
  if (n === 0) return { tone: 'danger', label: 'Due today', reminder: true, daysLeft: 0 };
  if (n <= 7) return { tone: 'warning', label: `Due in ${n} day${n === 1 ? '' : 's'}`, reminder: true, daysLeft: n };
  return { tone: 'warning', label: `Due in ${n} days`, reminder: false, daysLeft: n };
};
