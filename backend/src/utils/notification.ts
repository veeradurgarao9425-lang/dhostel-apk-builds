import https from 'https';
import db from '../config/database.js';

// Map of notification types to DB enum values
// DB Enum: 'Payment Due', 'New Admission', 'Expense Alert', 'System Alert', 'General'
export type NotificationType = 'Payment Due' | 'New Admission' | 'Expense Alert' | 'System Alert' | 'General';

interface SendNotificationOptions {
  userId: number;
  hostelId?: number | null;
  type: NotificationType;
  title: string;
  message: string;
  priority?: 'Low' | 'Medium' | 'High';
  data?: any;
}

/**
 * Sends a push notification via Expo and saves it in the local database.
 */
export const sendNotificationToUser = async (options: SendNotificationOptions): Promise<void> => {
  const { userId, hostelId, type, title, message, priority = 'Medium', data = {} } = options;

  try {
    // 1. Save to in-app notification table
    const [notificationId] = await db('notifications').insert({
      user_id: userId,
      hostel_id: hostelId || null,
      notification_type: type,
      title,
      message,
      priority,
      is_read: 0,
      created_at: new Date()
    });

    console.log(`[Notification] In-app notification saved. ID: ${notificationId} for User: ${userId}`);

    // 2. Fetch push tokens for this user
    const userTokens = await db('user_push_tokens')
      .where({ user_id: userId })
      .select('push_token');

    if (!userTokens || userTokens.length === 0) {
      console.log(`[Notification] No push tokens registered for user ID: ${userId}. Skipping push delivery.`);
      return;
    }

    const tokens = userTokens.map((t: any) => t.push_token);
    console.log(`[Notification] Sending push notification to ${tokens.length} tokens for user ID: ${userId}`);

    // 3. Send push notifications via Expo API
    const pushMessages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body: message,
      data: {
        notificationId,
        type,
        hostelId,
        ...data
      }
    }));

    const payload = JSON.stringify(pushMessages);

    const requestOptions = {
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    };

    const req = https.request(requestOptions, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          console.log(`[Expo Push] Response:`, JSON.stringify(parsed));
        } catch {
          console.log(`[Expo Push] Response text: ${responseBody}`);
        }
      });
    });

    req.on('error', (err) => {
      console.error('[Expo Push] HTTPS request error:', err);
    });

    req.write(payload);
    req.end();

  } catch (error) {
    console.error('[Notification] Error in sendNotificationToUser:', error);
  }
};

/**
 * Sends a notification to the owner of a specific hostel.
 */
export const sendNotificationToHostelOwner = async (
  hostelId: number,
  type: NotificationType,
  title: string,
  message: string,
  priority?: 'Low' | 'Medium' | 'High',
  data?: any
): Promise<void> => {
  try {
    const hostel = await db('hostel_master')
      .where({ hostel_id: hostelId })
      .select('owner_id')
      .first();

    if (!hostel || !hostel.owner_id) {
      console.error(`[Notification] Hostel ${hostelId} not found or has no owner.`);
      return;
    }

    await sendNotificationToUser({
      userId: hostel.owner_id,
      hostelId,
      type,
      title,
      message,
      priority,
      data
    });
  } catch (err) {
    console.error(`[Notification] Error sending to hostel owner:`, err);
  }
};
