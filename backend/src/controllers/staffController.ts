import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { checkHostelUniqueIdentifiers } from '../utils/validation.js';

// Get all staff (Owner sees only their hostel staff)
export const getStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, search, role } = req.query;
    const user = req.user;

    let query = db('staff').select('*');

    // If user is hostel owner (role_id = 2), filter by their hostel_id from JWT token
    if ((user?.role_id === 2 || (user?.role_id === 1 && user?.hostel_id))) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('hostel_id', user.hostel_id);
    } else if (hostelId) {
      query = query.where('hostel_id', hostelId);
    }

    if (role && role !== 'Management' && role !== 'All') {
      query = query.where('role', role);
    }

    if (search) {
      const searchTerm = `%${search}%`;
      query = query.where(function () {
        this.where('full_name', 'like', searchTerm)
          .orWhere('phone', 'like', searchTerm)
          .orWhere('role', 'like', searchTerm);
      });
    }

    const staff = await query.orderBy('created_at', 'desc');

    res.json({
      success: true,
      data: staff
    });
  } catch (error: any) {
    console.error('Get staff error:', error);
    res.status(500).json({
      success: false,
      error: error?.sqlMessage || error?.message || 'Failed to fetch staff'
    });
  }
};

// Get staff by ID
export const getStaffById = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId } = req.params;
    const staff = await db('staff').where('staff_id', staffId).first();

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    if (req.user?.hostel_id && staff.hostel_id !== req.user.hostel_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('Get staff by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff member'
    });
  }
};

// Create staff
export const createStaff = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const {
      full_name,
      phone,
      email,
      role,
      status,
      join_date,
      monthly_salary,
      aadhaar_number,
      photo,
      aadhaar_front,
      aadhaar_back,
      notes
    } = req.body;

    let hostel_id: number;
    if ((user?.role_id === 2 || (user?.role_id === 1 && user?.hostel_id))) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostel_id = user.hostel_id;
    } else {
      hostel_id = req.body.hostel_id;
      if (!hostel_id) {
        return res.status(400).json({
          success: false,
          error: 'hostel_id is required'
        });
      }
    }

    if (!full_name || !phone || !role || !join_date) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: full_name, phone, role, join_date'
      });
    }

    const validation = await checkHostelUniqueIdentifiers(hostel_id, {
      phone,
      email,
      id_number: aadhaar_number
    });

    if (!validation.isUnique) {
      return res.status(409).json({
        success: false,
        error: `The ${validation.conflictField} is already registered to a ${validation.conflictEntity} in this hostel.`
      });
    }

    const [staff_id] = await db('staff').insert({
      hostel_id,
      full_name,
      phone,
      email: email || null,
      role,
      status: status || 'ACTIVE',
      join_date,
      monthly_salary: monthly_salary || null,
      aadhaar_number: aadhaar_number || null,
      photo: photo || null,
      aadhaar_front: aadhaar_front || null,
      aadhaar_back: aadhaar_back || null,
      notes: notes || null
    });

    res.status(201).json({
      success: true,
      message: 'Staff member registered successfully',
      data: { staff_id }
    });
  } catch (error: any) {
    console.error('Create staff error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to create staff member'
    });
  }
};

// Update staff
export const updateStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId } = req.params;
    const updateData = { ...req.body, updated_at: new Date() };

    const staff = await db('staff').where('staff_id', staffId).first();
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    if (req.user?.hostel_id && staff.hostel_id !== req.user.hostel_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const checkingPhone = req.body.phone !== undefined ? req.body.phone : undefined;
    const checkingEmail = req.body.email !== undefined ? req.body.email : undefined;
    const checkingIdNumber = req.body.aadhaar_number !== undefined ? req.body.aadhaar_number : undefined;

    if (checkingPhone || checkingEmail || checkingIdNumber) {
      const validation = await checkHostelUniqueIdentifiers(
        staff.hostel_id,
        {
          phone: checkingPhone,
          email: checkingEmail,
          id_number: checkingIdNumber
        },
        { entityType: 'staff', entityId: staffId }
      );

      if (!validation.isUnique) {
        return res.status(409).json({
          success: false,
          error: `The ${validation.conflictField} is already registered to a ${validation.conflictEntity} in this hostel.`
        });
      }
    }

    await db('staff').where('staff_id', staffId).update(updateData);

    res.json({
      success: true,
      message: 'Staff member updated successfully'
    });
  } catch (error: any) {
    console.error('Update staff error:', error);
    res.status(500).json({
      success: false,
      error: error?.sqlMessage || error?.message || 'Failed to update staff member'
    });
  }
};

// ─── Staff wage payments ────────────────────────────────────────────────────

// GET /api/staff/:staffId/payments — per-worker payment history
export const getStaffPayments = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId } = req.params;
    const staff = await db('staff').where('staff_id', staffId).first();
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }
    if (req.user?.hostel_id && staff.hostel_id !== req.user.hostel_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const payments = await db('staff_payments')
      .where('staff_id', staffId)
      .orderBy('payment_date', 'desc')
      .orderBy('payment_id', 'desc');

    const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    res.json({ success: true, data: payments, summary: { count: payments.length, totalPaid } });
  } catch (error: any) {
    console.error('Get staff payments error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to fetch payments' });
  }
};

// POST /api/staff/:staffId/payments — record a wage payment (Advance or Salary payout)
export const addStaffPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId } = req.params;
    const {
      amount,
      payment_date,
      days_worked,
      payment_type,
      note,
      for_month,
      mode,
      transaction_id,
      receipt_number
    } = req.body;

    const staff = await db('staff').where('staff_id', staffId).first();
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }
    if (req.user?.hostel_id && staff.hostel_id !== req.user.hostel_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    if (!amount || Number(amount) <= 0 || !payment_date) {
      return res.status(400).json({ success: false, error: 'Required fields: amount, payment_date' });
    }

    // Derive for_month from payment_date if not provided
    const resolvedMonth = for_month || payment_date.substring(0, 7); // YYYY-MM

    const [payment_id] = await db('staff_payments').insert({
      hostel_id: staff.hostel_id,
      staff_id: Number(staffId),
      amount: Number(amount),
      payment_date,
      days_worked: days_worked ? Number(days_worked) : null,
      payment_type: payment_type || 'Advance',
      note: note || null,
      for_month: resolvedMonth,
      mode: mode || 'Cash',
      transaction_id: transaction_id || null,
      receipt_number: receipt_number || null,
      created_by: req.user?.user_id || null,
      created_at: new Date(),
    });

    res.status(201).json({ success: true, message: 'Payment recorded successfully', data: { payment_id } });
  } catch (error: any) {
    console.error('Add staff payment error:', error);
    res.status(500).json({ success: false, error: error?.sqlMessage || error?.message || 'Failed to record payment' });
  }
};

// GET /api/staff/:staffId/salary-summary — per-month salary cycle summary
export const getStaffMonthlySummary = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId } = req.params;

    const staff = await db('staff').where('staff_id', staffId).first();
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }
    if (req.user?.hostel_id && staff.hostel_id !== req.user.hostel_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const monthlySalary = Number(staff.monthly_salary || 0);

    // Get all payments grouped by for_month
    const payments = await db('staff_payments')
      .where('staff_id', staffId)
      .orderBy('for_month', 'desc')
      .orderBy('payment_date', 'desc');

    // Group by for_month
    const monthMap: Record<string, { advances: number; salary_paid: number; payments: any[] }> = {};

    for (const p of payments) {
      // Fallback: derive month from payment_date if for_month is null
      const month = p.for_month || (p.payment_date ? String(p.payment_date).substring(0, 7) : null);
      if (!month) continue;

      if (!monthMap[month]) {
        monthMap[month] = { advances: 0, salary_paid: 0, payments: [] };
      }

      const ptype = (p.payment_type || '').toLowerCase();
      if (ptype === 'salary') {
        monthMap[month].salary_paid += Number(p.amount || 0);
      } else {
        // Advance, Wage, Bonus, etc — treat as advance/deduction from salary
        monthMap[month].advances += Number(p.amount || 0);
      }
      monthMap[month].payments.push(p);
    }

    // Build summary array
    const summary = Object.entries(monthMap).map(([month, data]) => {
      const totalGiven = data.advances + data.salary_paid;
      const balance = Math.max(0, monthlySalary - totalGiven);
      const isSettled = data.salary_paid > 0 || totalGiven >= monthlySalary;
      return {
        for_month: month,
        monthly_salary: monthlySalary,
        total_advances: data.advances,
        salary_paid: data.salary_paid,
        total_given: totalGiven,
        balance_due: balance,
        is_settled: isSettled,
        payments: data.payments,
      };
    });

    // Current month (even if no payments yet)
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentExists = summary.find(s => s.for_month === currentMonth);
    const currentSummary = currentExists || {
      for_month: currentMonth,
      monthly_salary: monthlySalary,
      total_advances: 0,
      salary_paid: 0,
      total_given: 0,
      balance_due: monthlySalary,
      is_settled: false,
      payments: [],
    };

    res.json({
      success: true,
      data: {
        staff_id: staffId,
        staff_name: staff.full_name,
        monthly_salary: monthlySalary,
        current_month: currentSummary,
        history: summary,
      }
    });
  } catch (error: any) {
    console.error('Get staff monthly summary error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to fetch salary summary' });
  }
};

// DELETE /api/staff/payments/:paymentId
export const deleteStaffPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const payment = await db('staff_payments').where('payment_id', paymentId).first();
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    if (req.user?.hostel_id && payment.hostel_id !== req.user.hostel_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    await db('staff_payments').where('payment_id', paymentId).del();
    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error: any) {
    console.error('Delete staff payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete payment' });
  }
};

// Delete staff
export const deleteStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId } = req.params;
    const staff = await db('staff').where('staff_id', staffId).first();

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    if (req.user?.hostel_id && staff.hostel_id !== req.user.hostel_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    await db('staff').where('staff_id', staffId).del();

    res.json({
      success: true,
      message: 'Staff member deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete staff member'
    });
  }
};

export const checkUnique = async (req: AuthRequest, res: Response) => {
  try {
    const { phone, email, idProofNumber, staffId } = req.query;
    const hostelId = req.user?.hostel_id;
    if (!hostelId) return res.json({ success: true, phoneExists: false, emailExists: false, idProofExists: false });

    let phoneExists = false;
    let emailExists = false;
    let idProofExists = false;

    if (phone) {
      const validation = await checkHostelUniqueIdentifiers(
        hostelId,
        { phone: phone as string },
        staffId ? { entityType: 'staff', entityId: staffId as string } : undefined
      );
      if (!validation.isUnique) phoneExists = true;
    }

    if (email) {
      const validation = await checkHostelUniqueIdentifiers(
        hostelId,
        { email: email as string },
        staffId ? { entityType: 'staff', entityId: staffId as string } : undefined
      );
      if (!validation.isUnique) emailExists = true;
    }

    if (idProofNumber) {
      const validation = await checkHostelUniqueIdentifiers(
        hostelId,
        { id_number: idProofNumber as string },
        staffId ? { entityType: 'staff', entityId: staffId as string } : undefined
      );
      if (!validation.isUnique) idProofExists = true;
    }

    return res.json({ success: true, phoneExists, emailExists, idProofExists });
  } catch (error) {
    console.error('Staff check unique error:', error);
    return res.status(500).json({ success: false, error: 'Failed to check uniqueness' });
  }
};
