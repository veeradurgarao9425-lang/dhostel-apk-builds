import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendNotificationToHostelOwner, sendNotificationToAllHostelStudents } from '../utils/notification.js';
import { resolveScopedHostelId, resolveOwnerHostelId } from '../utils/scope.js';

// Get all notices for a hostel
export const getNotices = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user || (user.role_id !== 1 && user.role_id !== 2 && user.role_id !== 3)) {
      return res.status(403).json({ success: false, error: 'Unauthorized access.' });
    }
    // Owner (role 2): validate BOTH user_id AND hostel_id together in DB.
    // Admin/Super Admin (role 1): scoped to ?hostelId if given, otherwise global.
    const { hostelId: scopedHostelId, error: hostelError } = await resolveOwnerHostelId(user, req.query.hostelId as string);
    if (hostelError) {
      return res.status(403).json({ success: false, error: hostelError });
    }
    let query = db('notices');
    if (scopedHostelId) {
      query = query.where('hostel_id', scopedHostelId);
    }

    const notices = await query.orderBy('created_at', 'desc');

    res.json({ success: true, data: notices });
  } catch (error: any) {
    console.error('Get notices error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notices' });
  }
};

// Create a new notice (owner only)
export const createNotice = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { title, content, notice_type } = req.body;
    const file = req.file;

    if (!user || (user.role_id !== 1 && user.role_id !== 2)) {
      return res.status(403).json({ success: false, error: 'Unauthorized access.' });
    }

    let hostel_id: number;
    if (user.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({ success: false, error: 'Your account is not linked to any hostel.' });
      }
      hostel_id = user.hostel_id;
    } else {
      hostel_id = Number(req.body.hostel_id);
      if (!hostel_id) {
        return res.status(400).json({ success: false, error: 'hostel_id is required' });
      }
    }

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and Content are required fields' });
    }

    const resolvedType = notice_type || 'General';
    const imageUrl = file ? `/uploads/${file.filename}` : null;

    let notice_id: number;
    try {
      [notice_id] = await db('notices').insert({
        hostel_id,
        title,
        content,
        notice_type: resolvedType,
        image_url: imageUrl,
      });
    } catch (colErr: any) {
      if (colErr?.code === 'ER_BAD_FIELD_ERROR') {
        [notice_id] = await db('notices').insert({ hostel_id, title, content });
      } else {
        throw colErr;
      }
    }

    res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      data: { notice_id, image_url: imageUrl }
    });

    sendNotificationToAllHostelStudents(
      hostel_id,
      resolvedType,
      title,
      content,
      resolvedType === 'Important' ? 'High' : 'Medium',
      { id: notice_id }
    ).catch(err => console.error('Failed to send notice to students:', err));
  } catch (error: any) {
    console.error('Create notice error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to create notice' });
  }
};

// Update an existing notice (owner only)
export const updateNotice = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { noticeId } = req.params;
    const { title, content, notice_type } = req.body;
    const file = req.file;

    if (!user || (user.role_id !== 1 && user.role_id !== 2)) {
      return res.status(403).json({ success: false, error: 'Unauthorized access.' });
    }

    const existingNotice = await db('notices')
      .where({ notice_id: noticeId })
      .first();

    if (!existingNotice) {
      return res.status(404).json({ success: false, error: 'Notice not found' });
    }

    if (user.role_id === 2 && existingNotice.hostel_id !== user.hostel_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (notice_type) updateData.notice_type = notice_type;
    if (file) updateData.image_url = `/uploads/${file.filename}`;

    await db('notices').where({ notice_id: noticeId }).update(updateData);

    res.json({
      success: true,
      message: 'Notice updated successfully',
      data: { ...existingNotice, ...updateData }
    });
  } catch (error: any) {
    console.error('Update notice error:', error);
    res.status(500).json({ success: false, error: 'Failed to update notice' });
  }
};

// Delete a notice
export const deleteNotice = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { noticeId } = req.params;

    if (!user || (user.role_id !== 1 && user.role_id !== 2)) {
      return res.status(403).json({ success: false, error: 'Unauthorized access.' });
    }

    const notice = await db('notices')
      .where({ notice_id: noticeId })
      .first();

    if (!notice) {
      return res.status(404).json({ success: false, error: 'Notice not found' });
    }

    if (user.role_id === 2 && notice.hostel_id !== user.hostel_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    await db('notices').where({ notice_id: noticeId }).del();
    res.json({ success: true, message: 'Notice deleted successfully' });
  } catch (error: any) {
    console.error('Delete notice error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notice' });
  }
};

// Get Notice Categories for a hostel
export const getNoticeCategories = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (user.role_id === 2 && !user.hostel_id) {
      return res.status(403).json({ success: false, error: 'Your account is not linked to any hostel.' });
    }

    const scopedHostelId = resolveScopedHostelId(user, req.query.hostelId as string);
    let customCategories = [];
    try {
      let catQuery = db('notice_categories');
      if (scopedHostelId) {
        catQuery = catQuery.where('hostel_id', scopedHostelId);
      }
      customCategories = await catQuery;
    } catch (e) {
      // table might not exist yet
    }

    res.json({
      success: true,
      data: customCategories
    });
  } catch (error: any) {
    console.error('Get notice categories error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
};

// Create custom Notice Category
export const createNoticeCategory = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { category_name, color, emoji } = req.body;

    if (!user || (user.role_id !== 1 && user.role_id !== 2)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    let hostel_id: number;
    if (user.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({ success: false, error: 'Your account is not linked to any hostel.' });
      }
      hostel_id = user.hostel_id;
    } else {
      hostel_id = Number(req.body.hostel_id);
      if (!hostel_id) {
        return res.status(400).json({ success: false, error: 'hostel_id is required' });
      }
    }

    if (!category_name) {
      return res.status(400).json({ success: false, error: 'Category name required' });
    }

    await db('notice_categories').insert({
      hostel_id,
      category_name,
      color: color || '#6366F1',
      emoji: emoji || '📢'
    });

    res.status(201).json({ success: true, message: 'Category added successfully' });
  } catch (error: any) {
    console.error('Create category error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Category already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to add category' });
  }
};

// Delete custom Notice Category
export const deleteNoticeCategory = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { categoryName } = req.params;

    if (!user || (user.role_id !== 1 && user.role_id !== 2)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    let hostel_id: number;
    if (user.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({ success: false, error: 'Your account is not linked to any hostel.' });
      }
      hostel_id = user.hostel_id;
    } else {
      hostel_id = Number(req.query.hostel_id || req.body.hostel_id);
      if (!hostel_id) {
        return res.status(400).json({ success: false, error: 'hostel_id is required' });
      }
    }

    await db('notice_categories')
      .where({ hostel_id, category_name: categoryName })
      .del();

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
};
