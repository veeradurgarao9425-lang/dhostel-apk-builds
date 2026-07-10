import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const renewSubscription = async (req: AuthRequest, res: Response) => {
    try {
        const { hostel_id, plan_name = 'Yearly' } = req.body;
        
        if (!hostel_id) {
            return res.status(400).json({ success: false, error: 'Hostel ID is required' });
        }

        // Verify the user owns this hostel or is admin
        if (req.user?.role_id !== 1) {
            if (req.user?.hostel_id !== Number(hostel_id)) {
                const ownsHostel = await db('hostel_master')
                    .where({ hostel_id, owner_id: req.user?.user_id })
                    .first();
                if (!ownsHostel) {
                    return res.status(403).json({ success: false, error: 'Unauthorized to renew this hostel' });
                }
            }
        }

        const now = new Date();
        const endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

        await db('hostel_master')
            .where({ hostel_id })
            .update({
                subscription_status: 'Active',
                subscription_start_date: now,
                subscription_end_date: endDate,
                subscription_plan: plan_name,
                is_active: 1
            });

        return res.status(200).json({
            success: true,
            message: 'Subscription renewed successfully',
            data: {
                subscription_status: 'Active',
                subscription_end_date: endDate
            }
        });
    } catch (error) {
        console.error("Error renewing subscription:", error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

export const getSubscriptionStatus = async (req: AuthRequest, res: Response) => {
    try {
        const hostel_id = req.query.hostel_id || req.user?.hostel_id;
        
        if (!hostel_id) {
            return res.status(400).json({ success: false, error: 'Hostel ID is required' });
        }

        const hostel = await db('hostel_master')
            .where({ hostel_id })
            .first('trial_start_date', 'trial_end_date', 'subscription_status', 'subscription_start_date', 'subscription_end_date', 'subscription_plan', 'is_active');
            
        if (!hostel) {
            return res.status(404).json({ success: false, error: 'Hostel not found' });
        }

        return res.status(200).json({
            success: true,
            data: hostel
        });
    } catch (error) {
        console.error("Error getting subscription status:", error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
