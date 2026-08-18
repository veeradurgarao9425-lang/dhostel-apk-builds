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

/**
 * Blocks tenants (role_id=3) from owner/admin endpoints.
 * Super-admins (role 1) and owners (role 2) pass through.
 * Use on any route that should never be accessible by a tenant.
 */
export const isOwnerOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const roleId = req.user?.role_id;
  if (roleId === 3) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. This endpoint is restricted to hostel owners.',
    });
  }
  next();
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
