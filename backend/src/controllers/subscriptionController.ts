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
        let daysToAdd = 365; // Default to 1 year
        
        if (plan_name === '1_week') daysToAdd = 7;
        else if (plan_name === '1_month') daysToAdd = 30;
        else if (plan_name === '6_months') daysToAdd = 180;
        else if (plan_name === '1_year') daysToAdd = 365;

        const endDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

        await db('hostel_master')
            .where({ hostel_id })
            .update({
                subscription_status_id: 2, // 'Active'
                subscription_start_date: now,
                subscription_end_date: endDate,
                subscription_plan: plan_name,
                is_active: 1
            });

        try {
            // Get imports
            const { sendEmail } = await import('../utils/email.js');
            const { getRenewalConfirmationTemplate, getSuperAdminRenewalTemplate } = await import('../utils/emailTemplates.js');

            // Log History
            await db('subscription_history').insert({
                hostel_id,
                event_type: 'Subscription Renewed',
                remarks: `Renewed with ${plan_name} plan`
            });

            // Get owner details
            const hostel = await db('hostel_master').where({ hostel_id }).first();
            const owner = await db('users').where({ user_id: hostel?.owner_id }).first();

            const formattedEndDate = endDate.toLocaleDateString();

            if (owner && owner.email) {
                // Send email to owner
                await sendEmail({
                    to: owner.email,
                    subject: 'Subscription Renewed - Hostix',
                    html: getRenewalConfirmationTemplate(owner.full_name, hostel.hostel_name, formattedEndDate),
                    emailType: 'Renewal',
                    hostelId: hostel_id
                });
                
                // Add owner notification
                await db('notifications').insert({
                    user_id: owner.user_id,
                    hostel_id: hostel_id,
                    notification_type: 'Subscription Alert',
                    title: 'Subscription Renewed',
                    message: `Your subscription for ${hostel.hostel_name} has been renewed until ${formattedEndDate}.`,
                    priority: 'High'
                });
            }

            // Send Super Admin Alert
            await sendEmail({
                to: 'hostixhelp@gmail.com',
                subject: 'Hostel Subscription Renewed - Hostix',
                html: getSuperAdminRenewalTemplate({
                    hostel_name: hostel?.hostel_name,
                    subscription_plan: plan_name,
                    subscription_end_date: formattedEndDate
                }),
                emailType: 'Super Admin Alert',
                hostelId: hostel_id
            });

            // Super Admin in-app notification
            await db('notifications').insert({
                user_id: 1, // Super Admin
                hostel_id: hostel_id,
                notification_type: 'System Alert',
                title: 'Hostel Renewed',
                message: `${hostel?.hostel_name} has renewed its subscription.`,
                priority: 'Low'
            });
        } catch (err) {
            console.error("Failed to send renewal emails/logs:", err);
        }

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

        const hostel = await db('hostel_master as h')
            .leftJoin('subscription_status_master as ssm', 'h.subscription_status_id', 'ssm.id')
            .where({ 'h.hostel_id': hostel_id })
            .first(
                'h.trial_start_date',
                'h.trial_end_date',
                'ssm.name as subscription_status',
                'h.subscription_start_date',
                'h.subscription_end_date',
                'h.subscription_plan',
                'h.is_active'
            );
            
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

export const getSubscriptionHistory = async (req: AuthRequest, res: Response) => {
    try {
        const hostel_id = req.query.hostel_id || req.user?.hostel_id;
        
        let query = db('subscription_history').orderBy('created_at', 'desc');
        if (hostel_id) {
            query = query.where({ hostel_id });
        }

        const history = await query;
        return res.status(200).json({ success: true, data: history });
    } catch (error) {
        console.error("Error fetching subscription history:", error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

export const getEmailLogs = async (req: AuthRequest, res: Response) => {
    try {
        const hostel_id = req.query.hostel_id || req.user?.hostel_id;
        
        let query = db('email_logs').orderBy('sent_time', 'desc');
        if (hostel_id && req.user?.role_id !== 1) {
             query = query.where({ hostel_id });
        }

        const logs = await query.limit(100);
        return res.status(200).json({ success: true, data: logs });
    } catch (error) {
        console.error("Error fetching email logs:", error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
