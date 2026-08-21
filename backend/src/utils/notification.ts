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
    if (userId) {
      userTokens = await db('user_push_tokens').where({ user_id: userId }).select('push_token');
    } else if (studentId) {
      userTokens = await db('user_push_tokens').where({ student_id: studentId }).select('push_token');
    }

    if (!userTokens || userTokens.length === 0) {
      console.log(`[Notification] No push tokens registered for this user/student. Skipping push delivery.`);
      return;
    }

    const tokens = userTokens.map((t: any) => t.push_token);
    
    // 3. Send push notifications via Expo API
    const pushMessages = tokens.map(token => ({
      to: token,
      sound: 'default',
      channelId: 'default',
      title,
      body: message,
      data: { notificationId, type, hostelId, screen, params, referenceType, referenceId, deepLink, metadata, ...data }
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pushMessages),
    });

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
