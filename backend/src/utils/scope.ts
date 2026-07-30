import { TokenPayload } from './jwt.js';

/** True Super Admin: role_id 1 has unrestricted global access regardless of their own hostel_id. */
export const isSuperAdmin = (user?: TokenPayload): boolean => user?.role_id === 1;

/**
 * Resolves which single hostel_id a READ request should be scoped to.
 * - Owner (role 2): always their own hostel_id (unchanged behavior).
 * - Admin/Super Admin (role 1): an explicit queryHostelId if given (drill-down),
 *   otherwise `null` — meaning no filter / global across all hostels. Never falls
 *   back to the admin's own (possibly stale) hostel_id.
 * - Any other role: falls back to their own hostel_id (unchanged behavior).
 */
export const resolveScopedHostelId = (
  user?: TokenPayload,
  queryHostelId?: string | number
): number | null => {
  if (user?.role_id === 2) {
    return user.hostel_id ?? null;
  }
  if (isSuperAdmin(user)) {
    return queryHostelId !== undefined && queryHostelId !== null && queryHostelId !== ''
      ? Number(queryHostelId)
      : null;
  }
  return user?.hostel_id ?? null;
};

/**
 * Ownership check for a single resource already loaded from the DB (a student,
 * a payment, ...). Owner (role 2) may only touch resources belonging to their
 * own hostel_id; Super Admin (role 1) is unrestricted. Everyone else is denied —
 * routes that need a different rule (e.g. tenants acting on their own record)
 * must check that separately before/instead of calling this.
 */
export const canAccessHostel = (
  user?: TokenPayload,
  resourceHostelId?: number | string | null
): boolean => {
  if (isSuperAdmin(user)) return true;
  if (resourceHostelId === null || resourceHostelId === undefined) return false;
  return user?.hostel_id != null && Number(user.hostel_id) === Number(resourceHostelId);
};
