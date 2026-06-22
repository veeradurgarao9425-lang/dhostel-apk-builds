import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendNotificationToHostelOwner } from '../utils/notification.js';

// Get all notices for a hostel
export const getNotices = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user || (user.role_id !== 1 && user.role_id !== 2)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access.'
      });
    }

    if (!user.hostel_id) {
      return res.status(403).json({
        success: false,
        error: 'Your account is not linked to any hostel.'
      });
    }

    const notices = await db('notices')
      .where('hostel_id', user.hostel_id)
      .orderBy('created_at', 'desc');

    res.json({
      success: true,
      data: notices
    });
  } catch (error: any) {
    console.error('Get notices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notices'
    });
  }
};

// Create a new notice
export const createNotice = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { title, content } = req.body;

    if (!user || (user.role_id !== 1 && user.role_id !== 2)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access.'
      });
    }

    if (!user.hostel_id) {
      return res.status(403).json({
        success: false,
        error: 'Your account is not linked to any hostel.'
      });
    }

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and Content are required fields'
      });
    }

    const [notice_id] = await db('notices').insert({
      hostel_id: user.hostel_id,
      title,
      content
    });

    res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      data: { notice_id }
    });

    // Trigger push and in-app notification to owner
    sendNotificationToHostelOwner(
      user.hostel_id,
      'General',
      'New Notice Published',
      `Notice: "${title}" has been published.`,
      'Medium',
      { id: notice_id }
    ).catch(err => console.error('Failed to send notice notification:', err));
  } catch (error: any) {
    console.error('Create notice error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to create notice'
    });
  }
};

// Delete a notice
export const deleteNotice = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { noticeId } = req.params;

    if (!user || (user.role_id !== 1 && user.role_id !== 2)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access.'
      });
    }

    if (!user.hostel_id) {
      return res.status(403).json({
        success: false,
        error: 'Your account is not linked to any hostel.'
      });
    }

    // Verify notice belongs to owner's hostel
    const notice = await db('notices')
      .where({ notice_id: noticeId, hostel_id: user.hostel_id })
      .first();

    if (!notice) {
      return res.status(404).json({
        success: false,
        error: 'Notice not found or unauthorized'
      });
    }

    await db('notices')
      .where({ notice_id: noticeId })
      .del();

    res.json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete notice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notice'
    });
  }
};
