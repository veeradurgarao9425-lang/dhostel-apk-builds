import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendNotificationToHostelOwner, sendNotificationToAllHostelStudents } from '../utils/notification.js';

// Get all notices for a hostel
export const getNotices = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    // Allow role_id 1 (admin), 2 (owner), 3 (tenant)
    if (!user || (user.role_id !== 1 && user.role_id !== 2 && user.role_id !== 3)) {
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

// Create a new notice (owner only)
export const createNotice = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { title, content, notice_type } = req.body;

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

    // Validate notice_type if provided
    const validTypes = ['General', 'Important', 'Maintenance', 'Food'];
    const resolvedType = validTypes.includes(notice_type) ? notice_type : 'General';

    // Insert notice — try with notice_type column, fall back gracefully if it doesn't exist
    let notice_id: number;
    try {
      [notice_id] = await db('notices').insert({
        hostel_id: user.hostel_id,
        title,
        content,
        notice_type: resolvedType,
      });
    } catch (colErr: any) {
      // If notice_type column doesn't exist, insert without it
      if (colErr?.code === 'ER_BAD_FIELD_ERROR') {
        [notice_id] = await db('notices').insert({
          hostel_id: user.hostel_id,
          title,
          content,
        });
      } else {
        throw colErr;
      }
    }

    res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      data: { notice_id }
    });

    // Notify all students in the hostel
    sendNotificationToAllHostelStudents(
      user.hostel_id,
      resolvedType,
      title,
      content,
      resolvedType === 'Important' ? 'High' : 'Medium',
      { id: notice_id }
    ).catch(err => console.error('Failed to send notice to students:', err));
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

    const notice = await db('notices')
      .where({ notice_id: noticeId, hostel_id: user.hostel_id })
      .first();

    if (!notice) {
      return res.status(404).json({
        success: false,
        error: 'Notice not found or unauthorized'
      });
    }

    await db('notices').where({ notice_id: noticeId }).del();

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
