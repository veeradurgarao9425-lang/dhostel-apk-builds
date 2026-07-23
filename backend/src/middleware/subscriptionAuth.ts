import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import db from '../config/database.js';

export const requireActiveSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
    // If not authenticated or no user payload, skip (authMiddleware should handle this)
    if (!req.user) return next();

    let targetHostelId = req.user.hostel_id;

    // For Main Admin (role 1) or if hostel_id is explicitly passed in the request
    if (req.user.role_id === 1) {
        targetHostelId = req.query.hostelId || req.query.hostel_id || req.body.hostel_id || req.body.hostelId || req.params.hostelId || req.params.hostel_id || targetHostelId;
    } else {
        // For Owner/Staff, sometimes they pass hostelId in queries for specific lists, though they should be restricted to their own
        const reqHostelId = req.query.hostelId || req.query.hostel_id || req.body.hostel_id || req.body.hostelId || req.params.hostelId || req.params.hostel_id;
        if (reqHostelId && !targetHostelId) {
            targetHostelId = reqHostelId;
        }
    }

    if (targetHostelId) {
        try {
            const hostel = await db('hostel_master as h')
                .leftJoin('subscription_status_master as ssm', 'h.subscription_status_id', 'ssm.id')
                .where('h.hostel_id', targetHostelId)
                .first('h.is_active', 'ssm.name as subscription_status');
            
            // Allow access if active. If not active, block it.
            if (hostel && (hostel.is_active === 0 || hostel.is_active === false || hostel.subscription_status === 'Expired')) {
                 return res.status(403).json({
                    success: false,
                    message: "Your subscription has expired. Please renew to continue."
                });
            }
        } catch (error) {
            console.error("[Subscription Middleware] Error checking subscription status", error);
            // Allow through in case of DB glitch so we don't break the whole app, 
            // but log the error.
        }
    }
    
    next();
};
