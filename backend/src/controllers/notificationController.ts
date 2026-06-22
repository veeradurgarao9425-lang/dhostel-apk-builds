import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// Register push token for user device
export const registerToken = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { push_token, device_name, platform } = req.body;

    if (!user || !user.user_id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    if (!push_token) {
      return res.status(400).json({
        success: false,
        error: 'push_token is required'
      });
    }

    const existing = await db('user_push_tokens').where({ push_token }).first();

    if (existing) {
      // Update entry if user changed
      await db('user_push_tokens')
        .where({ push_token })
        .update({
          user_id: user.user_id,
          device_name: device_name || existing.device_name,
          platform: platform || existing.platform,
          updated_at: new Date()
        });
    } else {
      await db('user_push_tokens').insert({
        user_id: user.user_id,
        push_token,
        device_name: device_name || null,
        platform: platform || null,
        created_at: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Push token registered successfully'
    });
  } catch (error: any) {
    console.error('Register push token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register push token'
    });
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

    await db('user_push_tokens').where({ push_token }).del();

    res.json({
      success: true,
      message: 'Push token removed successfully'
    });
  } catch (error: any) {
    console.error('Deregister push token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove push token'
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

    const notifications = await db('notifications')
      .where({ user_id: user.user_id })
      .orderBy('created_at', 'desc')
      .limit(limit);

    res.json({
      success: true,
      data: notifications
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
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

    await db('notifications')
      .where({ notification_id: id, user_id: user.user_id })
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

    await db('notifications')
      .where({ user_id: user.user_id })
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
