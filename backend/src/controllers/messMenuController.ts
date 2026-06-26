import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import db from '../config/database.js';

export const createOrUpdateMenu = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.params;
    const { day_of_week, meal_type, items, timing } = req.body;

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
