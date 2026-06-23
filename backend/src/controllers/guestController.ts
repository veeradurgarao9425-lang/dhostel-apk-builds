import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// Resolve the hostel the request is scoped to (owner = JWT hostel, admin = body/query)
function resolveHostelId(req: AuthRequest): number | null {
  const user = req.user;
  if (user?.role_id === 2 || (user?.role_id === 1 && user?.hostel_id)) {
    return user.hostel_id || null;
  }
  const fromReq = req.body?.hostel_id || req.query?.hostelId;
  return fromReq ? Number(fromReq) : (user?.hostel_id || null);
}

// GET /api/guests — list short-stay guests for the active hostel
export const getGuests = async (req: AuthRequest, res: Response) => {
  try {
    const hostelId = resolveHostelId(req);
    if (!hostelId) {
      return res.status(403).json({ success: false, error: 'Your account is not linked to any hostel.' });
    }

    const { search, date } = req.query;
    let query = db('guests').where('hostel_id', hostelId);

    if (date) {
      query = query.where('check_in_date', date);
    }

    if (search) {
      const term = `%${search}%`;
      query = query.where(function () {
        this.where('full_name', 'like', term)
          .orWhere('phone', 'like', term)
          .orWhere('purpose', 'like', term);
      });
    }

    const guests = await query.orderBy('created_at', 'desc').orderBy('guest_id', 'desc');

    const totalCollected = guests.reduce((sum: number, g: any) => sum + Number(g.amount_paid || 0), 0);

    res.json({
      success: true,
      data: guests,
      summary: { count: guests.length, totalCollected },
    });
  } catch (error: any) {
    console.error('Get guests error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to fetch guests' });
  }
};

// POST /api/guests — record a new short-stay guest
export const createGuest = async (req: AuthRequest, res: Response) => {
  try {
    const hostelId = resolveHostelId(req);
    if (!hostelId) {
      return res.status(403).json({ success: false, error: 'Your account is not linked to any hostel.' });
    }

    const {
      full_name,
      phone,
      check_in_date,
      check_out_date,
      days,
      amount_paid,
      purpose,
      room_number,
      notes,
    } = req.body;

    if (!full_name || !check_in_date) {
      return res.status(400).json({ success: false, error: 'Required fields: full_name, check_in_date' });
    }

    const [guest_id] = await db('guests').insert({
      hostel_id: hostelId,
      full_name,
      phone: phone || null,
      check_in_date,
      check_out_date: check_out_date || null,
      days: days ? Number(days) : 1,
      amount_paid: amount_paid ? Number(amount_paid) : 0,
      purpose: purpose || null,
      room_number: room_number || null,
      notes: notes || null,
      created_at: new Date(),
    });

    res.status(201).json({ success: true, message: 'Guest recorded successfully', data: { guest_id } });
  } catch (error: any) {
    console.error('Create guest error:', error);
    res.status(500).json({ success: false, error: error?.sqlMessage || error?.message || 'Failed to record guest' });
  }
};

// PUT /api/guests/:guestId — update a guest (e.g. check-out, amount)
export const updateGuest = async (req: AuthRequest, res: Response) => {
  try {
    const hostelId = resolveHostelId(req);
    const { guestId } = req.params;

    const existing = await db('guests').where('guest_id', guestId).first();
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Guest not found' });
    }
    if (hostelId && existing.hostel_id !== hostelId) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const allowed = ['full_name', 'phone', 'check_in_date', 'check_out_date', 'days', 'amount_paid', 'purpose', 'room_number', 'notes'];
    const updateData: any = { updated_at: new Date() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    await db('guests').where('guest_id', guestId).update(updateData);
    res.json({ success: true, message: 'Guest updated successfully' });
  } catch (error: any) {
    console.error('Update guest error:', error);
    res.status(500).json({ success: false, error: error?.sqlMessage || error?.message || 'Failed to update guest' });
  }
};

// DELETE /api/guests/:guestId
export const deleteGuest = async (req: AuthRequest, res: Response) => {
  try {
    const hostelId = resolveHostelId(req);
    const { guestId } = req.params;

    const existing = await db('guests').where('guest_id', guestId).first();
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Guest not found' });
    }
    if (hostelId && existing.hostel_id !== hostelId) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    await db('guests').where('guest_id', guestId).del();
    res.json({ success: true, message: 'Guest deleted successfully' });
  } catch (error: any) {
    console.error('Delete guest error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete guest' });
  }
};
