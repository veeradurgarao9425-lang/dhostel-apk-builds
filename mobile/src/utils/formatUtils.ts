/**
 * formatUtils.ts — Shared formatting helpers for the dhostel mobile app.
 *
 * These small helpers (currency, avatars, initials) were copy-pasted in
 * FeeCollectionScreen, FinanceScreen, PendingPaymentsScreen, and HomeScreen.
 */

// ─── Currency ────────────────────────────────────────────────────────────────

/**
 * Formats a number as Indian Rupees (₹).
 * - 1,50,000 → ₹1.5L
 * - 10,000   → ₹10.0K
 * - 500      → ₹500
 */
export function fmtINR(n: number): string {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n}`;
}

/**
 * Formats a number as ₹X,XX,XXX (Indian locale, no abbreviation).
 * Example: 150000 → "₹1,50,000"
 */
export function fmtINRFull(n: number, locale = 'en-IN'): string {
    return `₹${n.toLocaleString(locale)}`;
}

/**
 * Safe parse float — returns 0 instead of NaN.
 */
export function safeFloat(v: any): number {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
}

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_COLORS = [
    '#7C3AED', '#2563EB', '#DC2626', '#D97706',
    '#059669', '#0891B2', '#EC4899', '#F97316',
];

/**
 * Returns a consistent avatar background color for a given name string.
 * Based on the first character code so it never changes for the same name.
 */
export function avatarColor(name: string): string {
    if (!name) return AVATAR_COLORS[0];
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

/**
 * Returns 2-letter initials from a first name + last name.
 * Example: getInitials("Ravi", "Kumar") → "RK"
 */
export function getInitials(first: string, last: string): string {
    return `${(first || ' ')[0]}${(last || ' ')[0]}`.toUpperCase();
}

/**
 * Returns the first letter of a name, uppercased.
 * Used for single-letter avatar circles.
 */
export function avatarLetter(name: string): string {
    return (name || 'T')[0].toUpperCase();
}
