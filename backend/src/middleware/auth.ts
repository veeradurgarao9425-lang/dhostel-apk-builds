import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.js';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required',
      });
    }

    const token = authHeader.substring(7);

    const payload = verifyToken(token);

    if (payload && payload.role_id) {
      payload.role_id = Number(payload.role_id);
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role_id !== 1) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }
  next();
};

import db from '../config/database.js';

/**
 * Restricts access to Super Admin (role_id=1) and Hostel Owner (role_id=2).
 * Strictly blocks Tenants (3), Staff (4), and unauthenticated/unassigned roles.
 */
export const isOwnerOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const roleId = req.user?.role_id;
  if (roleId !== 1 && roleId !== 2) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. This endpoint is restricted to hostel owners and administrators.',
    });
  }
  next();
};

/**
 * Verifies if the authenticated user has legitimate access to the specified hostel.
 * - Super Admin (role 1): global access to all hostels.
 * - Owner (role 2): only hostels they own (hostel_master.owner_id === user.user_id) or their active hostel.
 * - Tenant (role 3) / Staff (role 4): strictly their assigned hostel_id only.
 */
export const verifyHostelAccess = async (
  user: TokenPayload | undefined,
  targetHostelId: number | string
): Promise<boolean> => {
  if (!user) return false;
  const hostelIdNum = Number(targetHostelId);
  if (isNaN(hostelIdNum) || hostelIdNum <= 0) return false;

  // Super Admin has global access
  if (user.role_id === 1) return true;

  // Owner: verify ownership in hostel_master or token's active hostel_id
  if (user.role_id === 2) {
    if (user.hostel_id && Number(user.hostel_id) === hostelIdNum) return true;
    const owned = await db('hostel_master')
      .where({ hostel_id: hostelIdNum, owner_id: user.user_id, is_active: 1 })
      .first();
    return !!owned;
  }

  // Tenant (3) or Staff (4): strictly their assigned hostel_id
  if (user.role_id === 3 || user.role_id === 4) {
    return !!user.hostel_id && Number(user.hostel_id) === hostelIdNum;
  }

  return false;
};

/**
 * Restricts an endpoint to tenants only (role_id=3).
 * Owners (role 2) and admins (role 1) are blocked.
 * Use on endpoints that write data scoped to a specific tenant's student_id.
 */
export const isTenantOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const roleId = req.user?.role_id;
  if (roleId !== 3) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. This endpoint is for tenants only.',
    });
  }
  next();
};

export const queryTokenMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token = req.query.token as string;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required in query params or Authorization header',
      });
    }

    const payload = verifyToken(token);

    if (payload && payload.role_id) {
      payload.role_id = Number(payload.role_id);
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};
