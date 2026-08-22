import db from '../config/database.js';
import { io } from '../socket/index.js';

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
    const baseRow = {
      user_id: userId, student_id: studentId, hostel_id: hostelId,
      notification_type: type, title, message, priority, is_read: 0, created_at: new Date(),
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
        return db('notifications').insert(baseRow);
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

    // Extract unique tokens and validate
    const rawTokens = Array.from(new Set(userTokens.map((t: any) => String(t.push_token || '').trim()))).filter(Boolean);
    const validTokens = rawTokens.filter((token: string) => 
      token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')
    );

    if (validTokens.length === 0) {
      console.log(`[Notification] No valid Expo push tokens found among registered tokens:`, rawTokens);
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

    // 4. Send push notifications via Expo Push API
    const pushMessages = validTokens.map(token => {
      const { color, prefix } = getNotificationColorAndPrefix(title, type);
      const cleanTitle = title.replace(/^[\uD800-\uDBFF\uDC00-\uDFFF\u2600-\u27BF\s]+/, '').trim();
      const formattedTitle = `${prefix}${cleanTitle}`;

      return {
        to: token,
        sound: 'default',
        channelId: 'default',
        priority: 'high',
        title: formattedTitle,
        subtitle: 'HOSTIX',
        body: message,
        color: color,
        data: { notificationId, type, hostelId, screen, params, referenceType, referenceId, deepLink, metadata, ...data }
      };
    });

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pushMessages),
      });

      const result = await response.json().catch(() => null);
      console.log(`[Notification] Dispatched ${validTokens.length} push notification(s) to Expo. HTTP Status: ${response.status}`, result ? JSON.stringify(result) : '');
    } catch (pushErr: any) {
      console.error('[Notification] Error dispatching push to Expo servers:', pushErr.message || pushErr);
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
