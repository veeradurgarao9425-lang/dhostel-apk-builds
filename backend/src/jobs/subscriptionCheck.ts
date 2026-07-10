import cron from 'node-cron';
import db from '../config/database.js';
import { sendEmail } from '../utils/email.js'; // Assuming this exists or similar

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
        .where(function() {
          this.where('subscription_status', 'Trial')
              .andWhere('trial_end_date', '<', now)
        })
        .orWhere(function() {
          this.where('subscription_status', 'Active')
              .andWhere('subscription_end_date', '<', now)
        });

      if (expiredHostels.length > 0) {
        const expiredIds = expiredHostels.map(h => h.hostel_id);
        
        await db('hostel_master')
          .whereIn('hostel_id', expiredIds)
          .update({
            subscription_status: 'Expired',
            is_active: 0
          });

        console.log(`[Cron] Expired ${expiredIds.length} hostels.`);
      }

      // 2. 15-day warning notification
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      const warningDateStr = futureDate.toISOString().split('T')[0];

      // Query hostels expiring exactly in 15 days
      const warningHostels = await db('hostel_master')
        .join('users', 'hostel_master.owner_id', '=', 'users.user_id')
        .select('hostel_master.hostel_name', 'hostel_master.trial_end_date', 'hostel_master.subscription_end_date', 'hostel_master.subscription_status', 'users.email', 'users.full_name')
        .whereRaw('DATE(trial_end_date) = ? AND subscription_status = "Trial"', [warningDateStr])
        .orWhereRaw('DATE(subscription_end_date) = ? AND subscription_status = "Active"', [warningDateStr]);

      for (const hostel of warningHostels) {
        try {
           const expiryDate = hostel.subscription_status === 'Trial' ? hostel.trial_end_date : hostel.subscription_end_date;
           
           // If there is an email utility
           if (hostel.email) {
             const subject = `Notice: Your ${hostel.subscription_status} plan for ${hostel.hostel_name} expires in 15 days`;
             const message = `
               <p>Dear ${hostel.full_name},</p>
               <p>Your ${hostel.subscription_status} plan for your hostel <strong>${hostel.hostel_name}</strong> will expire in exactly 15 days on ${new Date(expiryDate).toLocaleDateString()}.</p>
               <p>To avoid any interruption in service, please login and renew your subscription.</p>
               <p>Thank you.</p>
             `;
             await sendEmail(hostel.email, subject, message);
           }
        } catch (e) {
          console.error(`[Cron] Failed to send 15-day warning to ${hostel.email}`, e);
        }
      }

      if (warningHostels.length > 0) {
        console.log(`[Cron] Sent 15-day warning to ${warningHostels.length} owners.`);
      }

    } catch (error) {
      console.error('[Cron] Error in subscription check job:', error);
    }
  });
};
