import { TokenPayload } from './jwt.js';
import db from '../config/database.js';

/** True Super Admin: role_id 1 has unrestricted global access regardless of their own hostel_id. */
export const isSuperAdmin = (user?: TokenPayload): boolean => user?.role_id === 1;

/**
 * Resolves which single hostel_id a READ request should be scoped to.
 * - Owner (role 2): always their own hostel_id (unchanged behavior, no DB call).
 * - Admin/Super Admin (role 1): an explicit queryHostelId if given (drill-down),
 *   otherwise `null` — meaning no filter / global across all hostels.
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
 * SECURE async hostel resolver that validates BOTH user_id AND hostel_id together.
 *
 * For Owner (role 2):
 *   - If requestedHostelId is provided: queries hostel_master WHERE owner_id = user.user_id
 *     AND hostel_id = requestedHostelId. Only grants access if BOTH match (double validation).
 *     Returns 403 if the owner does not own that specific hostel.
 *   - If not provided: falls back to the owner's primary hostel_id from JWT token.
 *
 * For Super Admin (role 1):
 *   - Returns requestedHostelId directly (no ownership check needed).
 *   - Falls back to null if not provided (global scope).
 *
 * Returns: { hostelId: number | null, error: string | null }
 *   - If hostelId is returned, the request is authorized.
 *   - If error is returned, the caller must respond with 403.
 */
export const resolveOwnerHostelId = async (
  user?: TokenPayload,
  requestedHostelId?: string | number | null
): Promise<{ hostelId: number | null; error: string | null }> => {
  const requestedId = requestedHostelId !== undefined && requestedHostelId !== null && requestedHostelId !== ''
    ? Number(requestedHostelId)
    : null;

  // Super Admin: unrestricted
  if (isSuperAdmin(user)) {
    return { hostelId: requestedId, error: null };
  }

  // Owner: validate BOTH user_id AND hostel_id together
  if (user?.role_id === 2) {
    if (!user.user_id) {
      return { hostelId: null, error: 'User identity is missing from token.' };
    }

    if (requestedId !== null) {
      // Double-validate: owner_id = user.user_id AND hostel_id = requestedId
      const hostelRow = await db('hostel_master')
        .where('owner_id', user.user_id)
        .where('hostel_id', requestedId)
        .where('is_active', 1)
        .select('hostel_id')
        .first();

      if (!hostelRow) {
        return {
          hostelId: null,
          error: `Access denied: You do not own hostel ${requestedId}, or it is inactive.`
        };
      }

      return { hostelId: requestedId, error: null };
    }

    // No hostelId requested — use primary hostel from JWT
    const primaryHostelId = user.hostel_id ?? null;
    return { hostelId: primaryHostelId, error: null };
  }

  // Other roles: fall back to their own hostel_id
  return { hostelId: user?.hostel_id ?? null, error: null };
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

/**
 * Resolves the authenticated student record for a tenant user.
 * 1. Checks students WHERE user_id = user.user_id
 * 2. Fallback: checks students WHERE student_id = user.user_id (for direct student tokens)
 * Returns the student record, or null if not found.
 */
export const getAuthenticatedStudent = async (
  user?: TokenPayload
): Promise<any | null> => {
  if (!user || !user.user_id) return null;

  let student = await db('students')
    .where('user_id', user.user_id)
    .first();

  if (!student) {
    student = await db('students')
      .where('student_id', user.user_id)
      .first();
  }

  return student || null;
};

/**
 * Returns the real student_id (integer) for the authenticated tenant user, or null if not found.
 */
export const getAuthenticatedStudentId = async (
  user?: TokenPayload
): Promise<number | null> => {
  const student = await getAuthenticatedStudent(user);
  return student?.student_id ? Number(student.student_id) : null;
};
