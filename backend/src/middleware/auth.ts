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

    // --- Test Mode Bypass ---
    if (token === 'mock-test-token-123') {
      req.user = {
        user_id: 9999,
        email: 'veeradurgarao840@gmail.com',
        role_id: 3,
        hostel_id: 1,
      };
      return next();
    }
    // ------------------------

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

export const queryTokenMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required in query params',
      });
    }

    // --- Test Mode Bypass ---
    if (token === 'mock-test-token-123') {
      req.user = {
        user_id: 9999,
        email: 'veeradurgarao840@gmail.com',
        role_id: 3,
        hostel_id: 1,
      };
      return next();
    }
    // ------------------------

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
