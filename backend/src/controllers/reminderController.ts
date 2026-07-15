import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { resolveScopedHostelId } from '../utils/scope.js';

// Get all reminders for a hostel
export const getReminders = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user || (user.role_id !== 1 && user.role_id !== 2)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access.'
      });
    }

    if (user.role_id === 2 && !user.hostel_id) {
      return res.status(403).json({
        success: false,
        error: 'Your account is not linked to any hostel.'
      });
    }

    const scopedHostelId = resolveScopedHostelId(user, req.query.hostelId as string);
    let query = db('reminders');
    if (scopedHostelId) {
      query = query.where('hostel_id', scopedHostelId);
    }

    const reminders = await query
      .orderBy('reminder_date', 'asc')
      .orderBy('created_at', 'desc');

    res.json({
      success: true,
      data: reminders
    });
  } catch (error: any) {
    console.error('Get reminders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reminders'
    });
  }
};

// Create a new reminder
export const createReminder = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { title, reminder_date, description, priority, category, status } = req.body;

    if (!user || (user.role_id !== 1 && user.role_id !== 2)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access.'
      });
    }

    let hostel_id: number;
    if (user.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostel_id = user.hostel_id;
    } else {
      hostel_id = Number(req.body.hostel_id);
      if (!hostel_id) {
        return res.status(400).json({
          success: false,
          error: 'hostel_id is required'
        });
      }
    }

    if (!title || !reminder_date) {
      return res.status(400).json({
        success: false,
        error: 'Title and Date are required fields'
      });
    }

    const [reminder_id] = await db('reminders').insert({
      hostel_id,
      title,
      reminder_date,
      description: description || null,
      priority: priority || 'MEDIUM',
      category: category || 'General',
      status: status || 'PENDING'
    });

    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      data: { reminder_id }
    });
  } catch (error: any) {
    console.error('Create reminder error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to create reminder'
    });
  }
};

// Update a reminder
export const updateReminder = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { reminderId } = req.params;
    const { title, reminder_date, description, priority, category, status } = req.body;

    if (!user || (user.role_id !== 1 && user.role_id !== 2)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access.'
      });
    }

    // Verify reminder exists
    const reminder = await db('reminders')
      .where({ reminder_id: reminderId })
      .first();

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    // Verify reminder belongs to owner's hostel if user is Owner
    if (user.role_id === 2 && reminder.hostel_id !== user.hostel_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied.'
      });
    }

    await db('reminders')
      .where({ reminder_id: reminderId })
      .update({
        title: title !== undefined ? title : reminder.title,
        reminder_date: reminder_date !== undefined ? reminder_date : reminder.reminder_date,
        description: description !== undefined ? description : reminder.description,
        priority: priority !== undefined ? priority : reminder.priority,
        category: category !== undefined ? category : reminder.category,
        status: status !== undefined ? status : reminder.status,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: 'Reminder updated successfully'
    });
  } catch (error: any) {
    console.error('Update reminder error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update reminder'
    });
  }
};

// Delete a reminder
export const deleteReminder = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { reminderId } = req.params;

    if (!user || (user.role_id !== 1 && user.role_id !== 2)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access.'
      });
    }

    // Verify reminder exists
    const reminder = await db('reminders')
      .where({ reminder_id: reminderId })
      .first();

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    // Verify reminder belongs to owner's hostel if user is Owner
    if (user.role_id === 2 && reminder.hostel_id !== user.hostel_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied.'
      });
    }

    await db('reminders')
      .where({ reminder_id: reminderId })
      .del();

    res.json({
      success: true,
      message: 'Reminder deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete reminder error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete reminder'
    });
  }
};
