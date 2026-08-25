/**
 * dashboardCache.ts
 *
 * Lightweight module-level cache shared across HomeScreen, MoreScreen, and
 * PendingPaymentsScreen.  No library required — identical pattern to the
 * globalNotifsCache already used in useNotifications.ts.
 *
 * Cache entries:
 *  - dashboardStats   (/reports/dashboard-stats)  — 30 s TTL
 *  - renewalStudents  (/students?renewalDueSoon)   — 30 s TTL
 */

// ── Dashboard Stats ────────────────────────────────────────────────────────────
let _dashboardStats: any = null;
let _dashboardStatsTime = 0;

// ── Renewal Students ───────────────────────────────────────────────────────────
let _renewalStudents: any[] = [];
let _renewalStudentsTime = 0;

export const DashboardCache = {
  // ── Stats ──────────────────────────────────────────────────────────────────
  setStats(data: any): void {
    _dashboardStats = data;
    _dashboardStatsTime = Date.now();
  },

  /** Returns the cached stats object if fresher than `ttlMs`, else null. */
  getStats(ttlMs = 30_000): any | null {
    if (_dashboardStats && Date.now() - _dashboardStatsTime < ttlMs) {
      return _dashboardStats;
    }
    return null;
  },

  // ── Renewals ───────────────────────────────────────────────────────────────
  setRenewals(data: any[]): void {
    _renewalStudents = data;
    _renewalStudentsTime = Date.now();
  },

  /** Returns the cached renewal list if fresher than `ttlMs`, else null. */
  getRenewals(ttlMs = 30_000): any[] | null {
    if (_renewalStudents.length > 0 && Date.now() - _renewalStudentsTime < ttlMs) {
      return _renewalStudents;
    }
    return null;
  },

  /** Call on logout / hostel switch so stale data is never shown. */
  invalidate(): void {
    _dashboardStats = null;
    _dashboardStatsTime = 0;
    _renewalStudents = [];
    _renewalStudentsTime = 0;
  },
};
