import db from '../config/database.js';
import { io } from '../socket/index.js';
import { firebaseMessaging, isFirebaseReady } from '../config/firebaseAdmin.js';

// Map of notification types to DB enum values (Now VARCHAR in DB)
export type NotificationType =
  | 'Payment Due'
  | 'New Admission'
  | 'Expense Alert'
  | 'System Alert'
  | 'General'
  | 'Complaint'
  | 'Leave'
  | 'Visitor'
  | 'Notice'
  | 'Payment Proof'
  | 'Subscription Alert'
  | 'Budget Alert';

export interface SendNotificationOptions {
  userId?: number | null;
  studentId?: number | null;
  hostelId?: number | null;
  type: NotificationType | string;
  title: string;
  message: string;
  priority?: 'Low' | 'Medium' | 'High';
  data?: any;
  // Deep-link fields — stored in DB + forwarded in push payload
  screen?: string;
  params?: Record<string, any>;
  referenceType?: string; // e.g. 'payment', 'student', 'complaint'
  referenceId?: string | number;
  deepLink?: string;
  metadata?: Record<string, any>;
  /**
   * When provided, checks if a notification with this exact key already
   * exists in the DB today before inserting. Prevents duplicate daily alerts.
   */
  deduplicateKey?: string;
}

/**
 * Sends a push notification via Expo and saves it in the local database.
 */
export const sendNotificationToUser = async (options: SendNotificationOptions): Promise<void> => {
  const {
    userId = null, studentId = null, hostelId = null,
    type, title, message, priority = 'Medium', data = {},
    screen, params, referenceType, referenceId, deepLink, metadata, deduplicateKey
  } = options;

  try {
    if (!userId && !studentId) {
      console.warn('[Notification] Must provide either userId or studentId.');
      return;
    }

    // Deduplication check — skip if same key already sent today
    if (deduplicateKey) {
      const existing = await db('notifications')
        .where({ deduplicate_key: deduplicateKey })
        .whereRaw('DATE(created_at) = CURRENT_DATE')
        .first()
        .catch(() => null); // graceful: column may not exist yet
      if (existing) {
        console.log(`[Notification] Skipping duplicate: ${deduplicateKey}`);
        return;
      }
    }

    // 1. Save to in-app notification table (with graceful fallback if new columns not yet patched)
    const baseRow: any = {
      user_id: userId, student_id: studentId, hostel_id: hostelId,
      type, notification_type: type, title, message, priority, is_read: 0, created_at: new Date(),
    };
    const enrichedRow = {
      ...baseRow,
      ...(screen !== undefined ? { screen } : {}),
      ...(params ? { params: JSON.stringify(params) } : {}),
      ...(referenceType ? { reference_type: referenceType } : {}),
      ...(referenceId !== undefined ? { reference_id: String(referenceId) } : {}),
      ...(deepLink ? { deep_link: deepLink } : {}),
      ...(deduplicateKey ? { deduplicate_key: deduplicateKey } : {}),
      ...((screen || params || metadata) ? { metadata: JSON.stringify({ ...(metadata || {}), ...(screen ? { screen } : {}), ...(params ? { params } : {}) }) } : {}),
    };
    const insertResult = await db('notifications').insert(enrichedRow).catch(async (err: any) => {
      if (err?.code === 'ER_BAD_FIELD_ERROR' || String(err?.sqlMessage || '').includes('Unknown column')) {
        // Fallback without whichever column was missing
        const cleanBase: any = {
          user_id: userId, student_id: studentId, hostel_id: hostelId,
          title, message, priority, is_read: 0, created_at: new Date(),
        };
        if (!String(err?.sqlMessage || '').includes('type')) {
          cleanBase.type = type;
        }
        return db('notifications').insert(cleanBase).catch(() => {
          delete cleanBase.type;
          cleanBase.notification_type = type;
          return db('notifications').insert(cleanBase).catch(() => null);
        });
      }
      throw err;
    });
    const notificationId = Array.isArray(insertResult) ? insertResult[0] : insertResult;

    console.log(`[Notification] Saved ID:${notificationId} | "${title}" → User:${userId ?? '-'} Student:${studentId ?? '-'}`);

    // 1b. Real-time Socket.IO emission
    try {
      if (io) {
        const payload = { notificationId, type, title, message, priority, data, screen, params, referenceType, referenceId, deepLink, metadata };
        if (userId) {
          io.to(`user_${userId}`).emit('REFRESH_NOTIFICATIONS', payload);
          io.to(`user_${userId}`).emit('new_notification', payload);
        }
        if (studentId) {
          io.to(`tenant_${studentId}`).emit('REFRESH_NOTIFICATIONS', payload);
          io.to(`tenant_${studentId}`).emit('new_notification', payload);
        }
        if (hostelId) {
          io.to(`hostel_${hostelId}`).emit('REFRESH_NOTIFICATIONS', payload);
          io.to(`hostel_${hostelId}`).emit('new_notification', payload);
        }
      }
    } catch (socErr) {
      console.error('[Notification] Socket emission error:', socErr);
    }

    // 2. Fetch push tokens for this user/student
    let userTokens: any[] = [];
    if (userId && studentId) {
      userTokens = await db('user_push_tokens')
        .where(function() {
          this.where('user_id', userId).orWhere('student_id', studentId);
        })
        .select('push_token');
    } else if (userId) {
      userTokens = await db('user_push_tokens')
        .where(function() {
          this.where('user_id', userId).orWhere('student_id', userId);
        })
        .select('push_token');
    } else if (studentId) {
      userTokens = await db('user_push_tokens')
        .where(function() {
          this.where('student_id', studentId).orWhere('user_id', studentId);
        })
        .select('push_token');
    }

    if (!userTokens || userTokens.length === 0) {
      console.log(`[Notification] No push tokens found in DB for User:${userId ?? '-'} / Student:${studentId ?? '-'}. Push delivery skipped.`);
      return;
    }

    // Extract unique tokens and separate into Expo tokens & Native Firebase FCM tokens
    const rawTokens = Array.from(new Set(userTokens.map((t: any) => String(t.push_token || '').trim()))).filter(Boolean);
    
    const expoTokens = rawTokens.filter((token: string) => 
      token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')
    );
    const fcmTokens = rawTokens.filter((token: string) => 
      !token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[') && token.length > 20
    );

    if (expoTokens.length === 0 && fcmTokens.length === 0) {
      console.log(`[Notification] No valid push tokens found among registered tokens:`, rawTokens);
      return;
    }

    // 3. Helper to format outside notification badge & color matching the design system
    const getNotificationColorAndPrefix = (titleText: string, typeText: string) => {
      const t = (titleText || '').toLowerCase();
      const typ = (typeText || '').toLowerCase();
      
      if (t.includes('payment') || typ.includes('payment') || t.includes('paid')) {
        return { color: '#10B981', prefix: '✅ ' }; // Emerald Green
      }
      if (t.includes('due') || typ.includes('due')) {
        return { color: '#DC2626', prefix: '📅 ' }; // Bright Red
      }
      if (t.includes('lunch') || t.includes('dinner') || t.includes('food') || t.includes('mess')) {
        return { color: '#F97316', prefix: '🍲 ' }; // Orange
      }
      if (t.includes('notice') || typ.includes('notice')) {
        return { color: '#2563EB', prefix: '📢 ' }; // Blue
      }
      if (t.includes('maintenance') || t.includes('complaint') || typ.includes('complaint')) {
        return { color: '#7C3AED', prefix: '🔧 ' }; // Purple
      }
      if (t.includes('admission') || t.includes('pre-booking') || typ.includes('admission')) {
        return { color: '#0284C7', prefix: '👤 ' }; // Sky Blue
      }
      if (t.includes('receipt') || t.includes('document')) {
        return { color: '#4F46E5', prefix: '📄 ' }; // Indigo
      }
      return { color: '#6D4AFF', prefix: '🔔 ' };
    };

    const { color, prefix } = getNotificationColorAndPrefix(title, type);
    const cleanTitle = title.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim();
    const formattedTitle = `${cleanTitle} ${prefix.trim()}`;
    const stringifiedData: Record<string, string> = {
      notificationId: String(notificationId || ''),
      type: String(type || ''),
      color: String(color || '#6D4AFF'),
      hostelId: String(hostelId || ''),
      screen: String(screen || ''),
      params: params ? JSON.stringify(params) : '',
      referenceType: String(referenceType || ''),
      referenceId: String(referenceId || ''),
      deepLink: String(deepLink || ''),
      ...(typeof data === 'object' && data !== null
        ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]))
        : {})
    };

    // 4. Dispatch via Direct Firebase Cloud Messaging (FCM)
    if (fcmTokens.length > 0 && isFirebaseReady() && firebaseMessaging) {
      try {
        const fcmResponse = await firebaseMessaging.sendEachForMulticast({
          tokens: fcmTokens,
          notification: {
            title: formattedTitle,
            body: message,
          },
          data: stringifiedData,
          android: {
            priority: 'high',
            notification: {
              channelId: 'default',
              sound: 'default',
              color: color || '#6D4AFF',
              defaultVibrateTimings: true,
              priority: 'high',
            },
          },
        });
        console.log(`[Notification] Direct Firebase FCM dispatched to ${fcmTokens.length} device(s). Success: ${fcmResponse.successCount}, Failure: ${fcmResponse.failureCount}`);
      } catch (fcmErr: any) {
        console.error('[Notification] Direct Firebase FCM delivery error:', fcmErr?.message || fcmErr);
      }
    }

    // 5. Dispatch via Expo Push Service (for Expo tokens)
    if (expoTokens.length > 0) {
      try {
        const messages = expoTokens.map((to: string) => ({
          to,
          sound: 'default',
          title: formattedTitle,
          body: message,
          data: stringifiedData,
          channelId: 'default',
          priority: 'high',
          color: color || '#6D4AFF',
        }));

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });
        console.log(`[Notification] Expo Push dispatched to ${expoTokens.length} device(s).`);
      } catch (expoErr: any) {
        console.error('[Notification] Expo push delivery error:', expoErr?.message || expoErr);
      }
    }
  } catch (error) {
    console.error('[Notification] Error in sendNotificationToUser:', error);
  }
};

/**
 * Sends a notification to the owner of a specific hostel.
 */
export const sendNotificationToHostelOwner = async (
  hostelId: number,
  type: NotificationType | string,
  title: string,
  message: string,
  priority?: 'Low' | 'Medium' | 'High',
  data?: any,
  extras?: Pick<SendNotificationOptions, 'screen' | 'params' | 'referenceType' | 'referenceId' | 'deepLink' | 'metadata' | 'deduplicateKey'>
): Promise<void> => {
  try {
    const hostel = await db('hostel_master').where({ hostel_id: hostelId }).select('owner_id').first();
    if (!hostel || !hostel.owner_id) return;
    await sendNotificationToUser({
      userId: hostel.owner_id, hostelId, type, title, message, priority, data, ...(extras || {}),
    });
  } catch (err) {
    console.error(`[Notification] Error sending to hostel owner:`, err);
  }
};

/**
 * Sends a notification to a specific student (Tenant).
 */
export const sendNotificationToStudent = async (
  studentId: number,
  type: NotificationType | string,
  title: string,
  message: string,
  priority?: 'Low' | 'Medium' | 'High',
  data?: any,
  extras?: Pick<SendNotificationOptions, 'screen' | 'params' | 'referenceType' | 'referenceId' | 'deepLink' | 'metadata' | 'deduplicateKey'>
): Promise<void> => {
  try {
    const student = await db('students').where({ student_id: studentId }).select('hostel_id').first();
    if (!student) return;
    await sendNotificationToUser({
      studentId, hostelId: student.hostel_id, type, title, message, priority, data, ...(extras || {}),
    });
  } catch (err) {
    console.error(`[Notification] Error sending to student:`, err);
  }
};

/**
 * Sends a notification to all active students in a hostel (useful for Notices).
 */
export const sendNotificationToAllHostelStudents = async (
  hostelId: number,
  type: NotificationType | string,
  title: string,
  message: string,
  priority?: 'Low' | 'Medium' | 'High',
  data?: any,
  extras?: Pick<SendNotificationOptions, 'screen' | 'params' | 'referenceType' | 'referenceId' | 'deepLink' | 'metadata'>
): Promise<void> => {
  try {
    const students = await db('students').where({ hostel_id: hostelId, status: 1 }).select('student_id');
    for (const student of students) {
      await sendNotificationToUser({
        studentId: student.student_id, hostelId, type, title, message, priority, data, ...(extras || {}),
      });
    }
  } catch (err) {
    console.error(`[Notification] Error sending to all hostel students:`, err);
  }
};
