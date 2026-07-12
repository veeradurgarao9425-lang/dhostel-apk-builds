import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { isOverstaying, expectedLastDay } from '../jobs/guestOverstay.js';
import { checkHostelUniqueIdentifiers } from '../utils/validation.js';

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

    const rows = await query.orderBy('created_at', 'desc').orderBy('guest_id', 'desc');

    // Decorate each guest with derived status info (computed, never stale).
    const guests = rows.map((g: any) => {
      const status = g.status || 'staying';
      const last = expectedLastDay(g);
      return {
        ...g,
        status,
        expected_last_day: last ? last.toISOString().split('T')[0] : null,
        is_overstay: status === 'staying' && isOverstaying(g),
      };
    });

    const totalCollected = guests.reduce((sum: number, g: any) => sum + Number(g.amount_paid || 0), 0);
    const staying = guests.filter((g: any) => g.status === 'staying').length;
    const overstay = guests.filter((g: any) => g.is_overstay).length;

    res.json({
      success: true,
      data: guests,
      summary: {
        count: guests.length,
        totalCollected,
        staying,
        checkedOut: guests.length - staying,
        overstay,
      },
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
      email,
      id_proof_type_id,
      id_proof_number,
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

    // Uniqueness validation (phone, email, ID number)
    const validation = await checkHostelUniqueIdentifiers(hostelId, {
      phone: phone || undefined,
      email: email || undefined,
      id_number: id_proof_number || undefined
    });

    if (!validation.isUnique) {
      return res.status(409).json({
        success: false,
        error: `The ${validation.conflictField} is already registered to a ${validation.conflictEntity} in this hostel.`
      });
    }

    const [guest_id] = await db('guests').insert({
      hostel_id: hostelId,
      full_name,
      phone: phone || null,
      email: email || null,
      id_proof_type_id: id_proof_type_id || null,
      id_proof_number: id_proof_number || null,
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

    const allowed = [
      'full_name', 'phone', 'email', 'id_proof_type_id', 'id_proof_number',
      'check_in_date', 'check_out_date', 'days', 'amount_paid', 'purpose', 
      'room_number', 'notes', 'status', 'checked_out_at'
    ];
    const updateData: any = { updated_at: new Date() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    // If the booking dates/length changed, allow the overstay alert to fire again.
    if (req.body.check_in_date !== undefined || req.body.check_out_date !== undefined || req.body.days !== undefined) {
      updateData.overstay_notified = 0;
    }

    const checkingPhone = req.body.phone !== undefined ? req.body.phone : undefined;
    const checkingEmail = req.body.email !== undefined ? req.body.email : undefined;
    const checkingIdNumber = req.body.id_proof_number !== undefined ? req.body.id_proof_number : undefined;

    if (checkingPhone || checkingEmail || checkingIdNumber) {
      const validation = await checkHostelUniqueIdentifiers(
        existing.hostel_id,
        {
          phone: checkingPhone,
          email: checkingEmail,
          id_number: checkingIdNumber
        },
        { entityType: 'guest', entityId: guestId }
      );

      if (!validation.isUnique) {
        return res.status(409).json({
          success: false,
          error: `The ${validation.conflictField} is already registered to a ${validation.conflictEntity} in this hostel.`
        });
      }
    }

    await db('guests').where('guest_id', guestId).update(updateData);
    res.json({ success: true, message: 'Guest updated successfully' });
  } catch (error: any) {
    console.error('Update guest error:', error);
    res.status(500).json({ success: false, error: error?.sqlMessage || error?.message || 'Failed to update guest' });
  }
};

// POST /api/guests/:guestId/checkout — mark a guest as vacated (keeps the income record)
export const checkoutGuest = async (req: AuthRequest, res: Response) => {
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

    const today = new Date().toISOString().split('T')[0];
    await db('guests').where('guest_id', guestId).update({
      status: 'checked_out',
      checked_out_at: req.body?.checked_out_at || today,
      updated_at: new Date(),
    });

    res.json({ success: true, message: 'Guest checked out successfully' });
  } catch (error: any) {
    console.error('Checkout guest error:', error);
    res.status(500).json({ success: false, error: error?.sqlMessage || error?.message || 'Failed to check out guest' });
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

export const checkUnique = async (req: AuthRequest, res: Response) => {
  try {
    const { phone, email, idProofNumber, guestId } = req.query;
    const hostelId = req.user?.hostel_id;
    if (!hostelId) return res.json({ success: true, phoneExists: false, emailExists: false, idProofExists: false });

    let phoneExists = false;
    let emailExists = false;
    let idProofExists = false;

    if (phone) {
      const validation = await checkHostelUniqueIdentifiers(
        hostelId,
        { phone: phone as string },
        guestId ? { entityType: 'guest', entityId: guestId as string } : undefined
      );
      if (!validation.isUnique) phoneExists = true;
    }

    if (email) {
      const validation = await checkHostelUniqueIdentifiers(
        hostelId,
        { email: email as string },
        guestId ? { entityType: 'guest', entityId: guestId as string } : undefined
      );
      if (!validation.isUnique) emailExists = true;
    }

    if (idProofNumber) {
      const validation = await checkHostelUniqueIdentifiers(
        hostelId,
        { id_number: idProofNumber as string },
        guestId ? { entityType: 'guest', entityId: guestId as string } : undefined
      );
      if (!validation.isUnique) idProofExists = true;
    }

    return res.json({ success: true, phoneExists, emailExists, idProofExists });
  } catch (error) {
    console.error('Guest check unique error:', error);
    return res.status(500).json({ success: false, error: 'Failed to check uniqueness' });
  }
};
