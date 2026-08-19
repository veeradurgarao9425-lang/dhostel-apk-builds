import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

export interface DeveloperTokenPayload {
  developer_id: number;
  username: string;
  email: string;
  is_developer: boolean;
  role: string;
  support_session_id?: number;
}

export interface DeveloperAuthRequest extends Request {
  developer?: {
    id: number;
    username: string;
    email: string;
    full_name: string;
    role_title: string;
    status: string;
    support_session_id?: number;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'hostix-dev-super-secret-production-key-2026';

/**
 * Generate a cryptographically signed developer token
 */
export const generateDeveloperToken = (payload: DeveloperTokenPayload, expiresIn: string = '24h'): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
};

/**
 * Middleware that strictly verifies developer token and checks developer status in database
 */
export const developerAuthMiddleware = async (
  req: DeveloperAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Developer authentication token is required',
      });
    }

    const token = authHeader.substring(7);

    let decoded: DeveloperTokenPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as DeveloperTokenPayload;
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired developer session token. Please log in again.',
      });
    }

    if (!decoded || !decoded.is_developer || !decoded.developer_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Privileged Developer credentials required.',
      });
    }

    // Verify against developer_users table
    const devUser = await db('developer_users')
      .where({ id: decoded.developer_id })
      .first();

    if (!devUser) {
      return res.status(401).json({
        success: false,
        error: 'Developer account not found or revoked.',
      });
    }

    if (devUser.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: `Developer account is ${devUser.status}. Access denied.`,
      });
    }

    req.developer = {
      id: devUser.id,
      username: devUser.username,
      email: devUser.email,
      full_name: devUser.full_name,
      role_title: devUser.role_title,
      status: devUser.status,
      support_session_id: decoded.support_session_id,
    };

    next();
  } catch (error: any) {
    console.error('Developer Auth Middleware Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server authorization error',
    });
  }
};

/**
 * Helper to record developer actions in audit log
 */
export const logDeveloperAction = async (params: {
  developer_id?: number | null;
  developer_username?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | number | null;
  hostel_id?: number | null;
  metadata?: any;
  req?: Request;
}) => {
  try {
    const ip = params.req?.headers['x-forwarded-for'] || params.req?.socket?.remoteAddress || 'unknown';
    const userAgent = params.req?.headers['user-agent'] || 'unknown';

    await db('developer_audit_logs').insert({
      developer_id: params.developer_id || null,
      developer_username: params.developer_username || null,
      action: params.action,
      target_type: params.target_type || null,
      target_id: params.target_id ? String(params.target_id) : null,
      hostel_id: params.hostel_id || null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      ip_address: String(ip).slice(0, 100),
      user_agent: String(userAgent).slice(0, 500),
      created_at: new Date(),
    });
  } catch (err: any) {
    console.error('[AuditLog] Failed to record developer audit entry:', err.message);
  }
};
