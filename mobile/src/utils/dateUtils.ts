/**
 * dateUtils.ts — Shared date helpers for the dhostel mobile app.
 *
 * Problem solved: toLocalDateStr / toLocalDateString / toLocalDateStr were
 * copy-pasted with different names in 4+ screens. One function here, used everywhere.
 */

/**
 * Returns a YYYY-MM-DD string using the LOCAL timezone (not UTC).
 * This avoids the common IST timezone-shift bug when using toISOString().
 *
 * Example: toLocalDateStr(new Date()) → "2026-06-17"
 */
export function toLocalDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Returns a human-readable "Month Year" label for a given Date.
 * Example: getMonthLabel(new Date()) → "June 2026"
 */
export function getMonthLabel(date: Date, locale = 'en-IN'): string {
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

/**
 * Returns the first day of the month for a given date, as a Date object.
 */
export function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Returns a new Date shifted by `months` months (positive = forward, negative = back).
 */
export function shiftMonth(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

/**
 * Returns true if the given date is in the current month and year.
 */
export function isCurrentMonth(date: Date): boolean {
    const today = new Date();
    return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth()
    );
}
