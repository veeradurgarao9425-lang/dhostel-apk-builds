import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { getAuthenticatedStudentId } from '../utils/scope.js';

// Register push token for user device
export const registerToken = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { push_token, device_name, platform } = req.body;

    if (!user || !user.user_id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!push_token) {
      return res.status(400).json({ success: false, error: 'push_token is required' });
    }

    // Tenants (role_id 3) store student_id (with user_id = null to avoid foreign key violations against users table)
    // Owners / Staff store user_id (with student_id = null)
    const isTenant = Number(user.role_id) === 3 || user.role === 'TENANT' || user.role === 'tenant' || user.role === 'student' || Boolean((user as any).is_tenant);
    let studentId: number | null = null;
    if (isTenant) {
      try {
        const resolved = await getAuthenticatedStudentId(user);
        studentId = resolved ? Number(resolved) : Number(user.user_id);
      } catch (e) {
        studentId = Number(user.user_id);
      }
    }

    const upsertData: any = {
      push_token,
      user_id: isTenant ? null : Number(user.user_id),
      student_id: isTenant ? studentId : null,
      device_name: device_name || null,
      platform: platform || null,
      updated_at: new Date(),
    };

    try {
      const existing = await db('user_push_tokens').where({ push_token }).first();
      if (existing) {
        await db('user_push_tokens').where({ push_token }).update(upsertData);
      } else {
        await db('user_push_tokens').insert({
          ...upsertData,
          created_at: new Date(),
        });
      }
      console.log(`[Notification] Token registered for ${isTenant ? `Student ${studentId}` : `User ${user.user_id}`}`);
    } catch (dbErr: any) {
      console.error('[Notification] Error saving push token:', dbErr?.message);
      // Fallback if student_id column is not in DB table
      if (isTenant && (dbErr?.code === 'ER_BAD_FIELD_ERROR' || String(dbErr?.sqlMessage || '').includes('student_id'))) {
        delete upsertData.student_id;
        const existing = await db('user_push_tokens').where({ push_token }).first().catch(() => null);
        if (existing) {
          await db('user_push_tokens').where({ push_token }).update(upsertData).catch(() => {});
        } else {
          await db('user_push_tokens').insert({
            ...upsertData,
            created_at: new Date(),
          }).catch(() => {});
        }
      }
    }

    return res.json({ success: true, message: 'Push token registered successfully' });
  } catch (error: any) {
    console.error('Register push token error (handled):', error);
    return res.json({ success: true, message: 'Push token registration handled' });
  }
};


// Deregister push token
export const deregisterToken = async (req: AuthRequest, res: Response) => {
  try {
    const { push_token } = req.body;

    if (!push_token) {
      return res.status(400).json({
        success: false,
        error: 'push_token is required'
      });
    }

    await db('user_push_tokens').where({ push_token }).del().catch(() => {});

    res.json({
      success: true,
      message: 'Push token removed successfully'
    });
  } catch (error: any) {
    console.error('Deregister push token error (handled):', error);
    res.json({
      success: true,
      message: 'Push token removed'
    });
  }
};

// Fetch in-app notifications
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!user || !user.user_id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const isTenant = Number(user.role_id) === 3 || user.role === 'TENANT' || user.role === 'tenant' || user.role === 'student';
    let realStudentId: any = null;
    if (isTenant) {
      try {
        const resolved = await getAuthenticatedStudentId(user);
        realStudentId = resolved ? Number(resolved) : Number(user.user_id);
      } catch (e) {
        realStudentId = Number(user.user_id);
      }
    }

    let notifications: any[] = [];
    try {
      let query = db('notifications').orderBy('created_at', 'desc').limit(limit);
      if (isTenant && realStudentId) {
        query = query.where('student_id', realStudentId);
      } else {
        query = query.where('user_id', user.user_id);
      }
      notifications = await query;
    } catch (queryErr) {
      notifications = await db('notifications')
        .where(isTenant && realStudentId ? { student_id: realStudentId } : { user_id: user.user_id })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .catch(() => []);
    }

    return res.json({
      success: true,
      data: notifications || []
    });
  } catch (error: any) {
    console.error('Get notifications error (handled):', error);
    return res.json({
      success: true,
      data: []
    });
  }
};

// Mark single notification as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user || !user.user_id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const isTenant = user.role_id === 3;
    let query = db('notifications').where('notification_id', id);
    if (isTenant) {
      const realStudentId = await getAuthenticatedStudentId(user) || user.user_id;
      query = query.andWhere('student_id', realStudentId);
    } else {
      query = query.andWhere('user_id', user.user_id);
    }

    await query.update({ is_read: 1 });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error: any) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
};

// Mark all user notifications as read
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user || !user.user_id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const isTenant = user.role_id === 3;
    let query = db('notifications');
    if (isTenant) {
      const realStudentId = await getAuthenticatedStudentId(user) || user.user_id;
      query = query.where('student_id', realStudentId);
    } else {
      query = query.where('user_id', user.user_id);
    }

    await query.update({ is_read: 1 });

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error: any) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
};

// ── Test notification endpoint — fires a real push to the logged-in user ──────
import { sendNotificationToUser } from '../utils/notification.js';
import { isFirebaseReady } from '../config/firebaseAdmin.js';
import { sendMorningDigest } from '../jobs/ownerDailyAlerts.js';
import { istToday } from '../utils/istTime.js';

/**
 * GET /notifications/diagnostics — tells the logged-in user exactly why a push
 * would or wouldn't reach this account (Firebase up? device token registered?).
 */
export const getPushDiagnostics = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const isTenant = Number(user.role_id) === 3;
    let studentId: number | null = null;
    if (isTenant) {
      const resolved = await getAuthenticatedStudentId(user).catch(() => null);
      studentId = resolved ? Number(resolved) : Number(user.user_id);
    }
    const tokens = await db('user_push_tokens')
      .where(isTenant ? { student_id: studentId } : { user_id: Number(user.user_id) })
      .select('platform', 'device_name', 'updated_at');

    return res.json({
      success: true,
      data: {
        firebaseReady: isFirebaseReady(),
        role: isTenant ? 'tenant' : 'owner/staff',
        registeredDevices: tokens.length,
        devices: tokens,
        serverTimeIST: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' }).format(new Date()),
        hint: !isFirebaseReady()
          ? 'Firebase Admin not initialised on the server — set FIREBASE_SERVICE_ACCOUNT.'
          : tokens.length === 0
            ? 'No device token registered for this account — open the app, allow notifications, log in again.'
            : 'Setup looks good. Use POST /notifications/test to send a real push.',
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
};

/**
 * POST /notifications/test-digest — sends the caller's OWN hostel the real 7 AM
 * morning status digest right now (owner/staff only; never notifies anyone else).
 */
export const sendTestMorningDigest = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id || Number(user.role_id) === 3) {
      return res.status(403).json({ success: false, error: 'Owner accounts only' });
    }
    const hostelId = user.hostel_id;
    const hostel = hostelId ? await db('hostel_master').where({ hostel_id: hostelId, owner_id: user.user_id }).first() : null;
    if (!hostel) return res.status(404).json({ success: false, error: 'No hostel found for this owner' });

    await sendMorningDigest(hostel, istToday(), true);
    return res.json({ success: true, message: 'Morning digest sent to your device' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
};

export const sendTestNotification = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const type = (req.body?.type as string) || 'General';

    const notificationMap: Record<string, { title: string; message: string }> = {
      General:   { title: '🔔 Test Notification', message: 'This is a test push notification from Hostix!' },
      Payment:   { title: '✅ Payment Received', message: '₹3,250 payment received successfully for Room 101.' },
      Expense:   { title: '💸 Expense Added', message: 'New expense of ₹450 was added for Groceries.' },
      DueReminder: { title: '📅 Rent Due Tomorrow', message: '₹4,250 rent is due tomorrow. Please pay on time.' },
      Notice:    { title: '📢 New Notice Posted', message: 'Important notice: Mess timings have been updated.' },
      Maintenance: { title: '🔧 Maintenance Alert', message: 'Water supply will be off from 10 AM to 2 PM today.' },
    };

    const { title, message } = notificationMap[type] || notificationMap['General'];

    const isTenant = user.role_id === 3;
    let studentId: any = null;
    if (isTenant) {
      try {
        studentId = await getAuthenticatedStudentId(user) || null;
      } catch (_) {}
    }

    await sendNotificationToUser({
      userId: isTenant ? null : user.user_id, // tenant JWT user_id is a student id — never file it as a user id
      studentId: isTenant ? (studentId || Number(user.user_id)) : null,
      hostelId: user.hostel_id || null,
      type: 'General',
      title,
      message,
      priority: 'High',
      screen: 'Notifications',
    });

    return res.json({
      success: true,
      message: `Test notification "${type}" sent to user ${user.user_id}`,
    });
  } catch (error: any) {
    console.error('Send test notification error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to send test notification' });
  }
};

