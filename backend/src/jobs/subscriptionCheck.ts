import cron from 'node-cron';
import db from '../config/database.js';
import { sendEmail } from '../utils/email.js';
import { 
  getTrialReminderTemplate, 
  getSubscriptionExpiredTemplate, 
  getSuperAdminExpiryTemplate 
} from '../utils/emailTemplates.js';
import { sendNotificationToHostelOwner } from '../utils/notification.js';
import { notifyDeveloper } from '../services/developerNotificationService.js';

export const startSubscriptionCheckJob = () => {
  // Run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Running daily subscription & trial check job...');
    try {
      const now = new Date();
      // Format as YYYY-MM-DD for comparison
      const todayDate = now.toISOString().split('T')[0];

      // 1. Process expirations
      const expiredHostels = await db('hostel_master')
        .join('users', 'hostel_master.owner_id', '=', 'users.user_id')
        .select('hostel_master.*', 'users.email', 'users.full_name')
        .where(function() {
          this.where('subscription_status_id', 1)
              .andWhere('trial_end_date', '<', now)
        })
        .orWhere(function() {
          this.where('subscription_status_id', 2)
              .andWhere('subscription_end_date', '<', now)
        });

      if (expiredHostels.length > 0) {
        for (const hostel of expiredHostels) {
          // Update DB Status
          await db('hostel_master')
            .where({ hostel_id: hostel.hostel_id })
            .update({
              subscription_status_id: null, // Expired
              is_active: 0
            });

          // Log History
          await db('subscription_history').insert({
              hostel_id: hostel.hostel_id,
              event_type: hostel.subscription_status_id === 1 ? 'Trial Expired' : 'Subscription Expired',
              remarks: `Expired on ${todayDate}`
          });

          // Email Owner
          if (hostel.email) {
            await sendEmail({
              to: hostel.email,
              subject: 'Subscription Expired - Hostix',
              html: getSubscriptionExpiredTemplate(hostel.full_name, hostel.hostel_name),
              emailType: 'Expiry Alert',
              hostelId: hostel.hostel_id
            });

            // Owner in-app + push notification
            await sendNotificationToHostelOwner(
              hostel.hostel_id,
              'Subscription Alert',
              'Subscription Expired',
              `Your subscription for ${hostel.hostel_name} has expired. Access is restricted.`,
              'High',
              { hostel_id: hostel.hostel_id },
              { screen: 'Subscription', params: { hostelId: hostel.hostel_id }, referenceType: 'hostel', referenceId: hostel.hostel_id }
            );
          }

          // Email Super Admin
          await sendEmail({
            to: process.env.SUPER_ADMIN_EMAIL || 'hostixhelp@gmail.com',
            subject: 'Hostel Subscription Expired Alert - Hostix',
            html: getSuperAdminExpiryTemplate({ hostel_name: hostel.hostel_name, email: hostel.email }),
            emailType: 'Super Admin Alert',
            hostelId: hostel.hostel_id
          });

          // Developer Notification Centre
          notifyDeveloper({
            type: 'SUBSCRIPTION_EXPIRED',
            title: 'Hostel Subscription Expired',
            message: `Subscription for "${hostel.hostel_name}" has expired (Owner: ${hostel.full_name || 'N/A'}).`,
            priority: 'HIGH',
            relatedEntity: 'HOSTEL',
            relatedEntityId: hostel.hostel_id,
            metadata: {
              hostel_id: hostel.hostel_id,
              hostel_name: hostel.hostel_name,
              owner_id: hostel.owner_id,
              owner_name: hostel.full_name,
              owner_email: hostel.email,
            },
            email: false,
          });
        }
        console.log(`[Cron] Expired ${expiredHostels.length} hostels.`);
      }

      // 2. Reminder Notifications (7, 3, 1 days)
      const daysToRemind = [7, 3, 1];
      
      for (const days of daysToRemind) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        const warningDateStr = futureDate.toISOString().split('T')[0];

        const warningHostels = await db('hostel_master')
          .join('users', 'hostel_master.owner_id', '=', 'users.user_id')
          .select('hostel_master.hostel_id', 'hostel_master.hostel_name', 'hostel_master.trial_end_date', 'hostel_master.subscription_end_date', 'hostel_master.subscription_status_id', 'users.email', 'users.full_name', 'users.user_id')
          .whereRaw('DATE(trial_end_date) = ? AND subscription_status_id = 1', [warningDateStr])
          .orWhereRaw('DATE(subscription_end_date) = ? AND subscription_status_id = 2', [warningDateStr]);

        for (const hostel of warningHostels) {
          try {
             const expiryDate = hostel.subscription_status_id === 1 ? hostel.trial_end_date : hostel.subscription_end_date;
             
             if (hostel.email) {
               await sendEmail({
                 to: hostel.email,
                 subject: `Trial Expiry Reminder - ${days} Days Left`,
                 html: getTrialReminderTemplate(hostel.full_name, hostel.hostel_name, days, new Date(expiryDate).toLocaleDateString()),
                 emailType: 'Trial Reminder',
                 hostelId: hostel.hostel_id
               });

               await sendNotificationToHostelOwner(
                 hostel.hostel_id,
                 'Subscription Alert',
                 'Subscription Expiring Soon',
                 `Your subscription for ${hostel.hostel_name} expires in ${days} day(s). Renew to avoid disruption.`,
                 'Medium',
                 { hostel_id: hostel.hostel_id, days_left: days },
                 { screen: 'Subscription', params: { hostelId: hostel.hostel_id }, referenceType: 'hostel', referenceId: hostel.hostel_id, deduplicateKey: `sub_exp_${hostel.hostel_id}_${days}d` }
               );
             }
          } catch (e) {
            console.error(`[Cron] Failed to send ${days}-day warning to ${hostel.email}`, e);
          }
        }

        if (warningHostels.length > 0) {
          console.log(`[Cron] Sent ${days}-day warning to ${warningHostels.length} owners.`);
        }
      }

    } catch (error) {
      console.error('[Cron] Error in subscription check job:', error);
    }
  });
};
