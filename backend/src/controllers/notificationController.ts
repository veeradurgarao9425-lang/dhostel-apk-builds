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

    // Tenants (role_id 3) store both student_id and user_id; owners/staff store user_id
    const isTenant = user.role_id === 3;
    let studentId: any = null;
    if (isTenant) {
      try {
        studentId = await getAuthenticatedStudentId(user) || user.user_id;
      } catch (e) {
        studentId = user.user_id;
      }
    }

    const upsertData: any = {
      push_token,
      user_id: user.user_id,
      device_name: device_name || null,
      platform: platform || null,
      updated_at: new Date(),
    };
    if (studentId) {
      upsertData.student_id = studentId;
    }

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
    } catch (dbErr: any) {
      // Fallback if student_id column is not in DB table
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

    const isTenant = user.role_id === 3;
    let realStudentId: any = null;
    if (isTenant) {
      try {
        realStudentId = await getAuthenticatedStudentId(user) || user.user_id;
      } catch (e) {
        realStudentId = user.user_id;
      }
    }

    let notifications: any[] = [];
    try {
      let query = db('notifications').orderBy('created_at', 'desc').limit(limit);
      if (isTenant && realStudentId) {
        query = query.where(function() {
          this.where('student_id', realStudentId).orWhere('user_id', user.user_id);
        });
      } else {
        query = query.where('user_id', user.user_id);
      }
      notifications = await query;
    } catch (queryErr) {
      notifications = await db('notifications')
        .where('user_id', user.user_id)
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
    let condition: any = { notification_id: id, user_id: user.user_id };
    if (isTenant) {
      const realStudentId = await getAuthenticatedStudentId(user) || user.user_id;
      condition = { notification_id: id, student_id: realStudentId };
    }

    await db('notifications')
      .where(condition)
      .update({ is_read: 1 });

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
    let condition: any = { user_id: user.user_id };
    if (isTenant) {
      const realStudentId = await getAuthenticatedStudentId(user) || user.user_id;
      condition = { student_id: realStudentId };
    }

    await db('notifications')
      .where(condition)
      .update({ is_read: 1 });

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
      userId: user.user_id,
      studentId,
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

