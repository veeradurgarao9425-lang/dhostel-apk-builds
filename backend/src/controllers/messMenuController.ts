import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import db from '../config/database.js';
import { sendNotificationToAllHostelStudents } from '../utils/notification.js';

export const createOrUpdateMenu = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.params;
    const { day_of_week, meal_type, items, timing } = req.body;
    const user = req.user;

    // Restrict Owner to their own hostel
    if (user?.role_id === 2 && user.hostel_id !== Number(hostelId)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (!day_of_week || !meal_type || !items) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check if entry exists for this day and meal
    const existing = await db('mess_menu')
      .where({ hostel_id: hostelId, day_of_week, meal_type })
      .first();

    if (existing) {
      await db('mess_menu')
        .where('menu_id', existing.menu_id)
        .update({ items, timing: timing || null });
    } else {
      await db('mess_menu').insert({
        hostel_id: hostelId,
        day_of_week,
        meal_type,
        items,
        timing: timing || null
      });
    }

    // Notify all active tenants that the menu has been updated
    sendNotificationToAllHostelStudents(
      Number(hostelId),
      'Notice',
      '🍽️ Mess Menu Updated',
      `The ${meal_type} menu for ${day_of_week} has been updated. Check the latest menu in the app.`,
      'Low'
    ).catch(err => console.error('Failed to send mess menu notification:', err));

    res.status(200).json({ success: true, message: 'Menu updated successfully' });
  } catch (error: any) {
    console.error('Error updating mess menu:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getMenu = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.params;
    const { day_of_week } = req.query;
    const user = req.user;

    // Restrict Owner to their own hostel
    if (user?.role_id === 2 && user.hostel_id !== Number(hostelId)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    let query = db('mess_menu').where('hostel_id', hostelId);
    
    if (day_of_week) {
      query = query.andWhere('day_of_week', day_of_week);
    }

    const menu = await query.orderBy('meal_type', 'asc');

    res.status(200).json({ success: true, menu });
  } catch (error: any) {
    console.error('Error fetching mess menu:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
