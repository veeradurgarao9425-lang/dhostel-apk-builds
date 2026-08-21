import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { checkHostelUniqueIdentifiers } from '../utils/validation.js';
import { resolveScopedHostelId, resolveOwnerHostelId, canAccessHostel } from '../utils/scope.js';
import { processFileUpload } from '../utils/fileUpload.js';

// Get all staff (Owner sees only their hostel staff)
export const getStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, search, role } = req.query;
    const user = req.user;

    let query = db('staff').select('*');

    // Owner (role 2): validate BOTH user_id AND hostel_id together in DB.
    // Admin/Super Admin (role 1): scoped to ?hostelId if given, otherwise global.
    const { hostelId: scopedHostelId, error: hostelError } = await resolveOwnerHostelId(user, hostelId as string | undefined);
    if (hostelError) {
      return res.status(403).json({ success: false, error: hostelError });
    }
    if (scopedHostelId) {
      query = query.where('hostel_id', scopedHostelId);
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

    if (!canAccessHostel(req.user, staff.hostel_id)) {
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

    const { hostelId, error: hostelError } = await resolveOwnerHostelId(user, req.body.hostel_id);
    if (hostelError || !hostelId) {
      return res.status(403).json({
        success: false,
        error: hostelError || 'Cannot determine hostel. Specify a valid hostel_id.'
      });
    }

    // Process file uploads if present
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let finalPhoto = photo || null;
    let finalFront = aadhaar_front || null;
    let finalBack = aadhaar_back || null;

    if (files?.photo?.[0] || files?.profile_photo?.[0]) {
      const file = files.photo?.[0] || files.profile_photo?.[0];
      finalPhoto = await processFileUpload(file, 'avatars');
    }
    if (files?.aadhaar_front?.[0] || files?.id_proof_front?.[0]) {
      const file = files.aadhaar_front?.[0] || files.id_proof_front?.[0];
      finalFront = await processFileUpload(file, 'id_proofs');
    }
    if (files?.aadhaar_back?.[0] || files?.id_proof_back?.[0]) {
      const file = files.aadhaar_back?.[0] || files.id_proof_back?.[0];
      finalBack = await processFileUpload(file, 'id_proofs');
    }

    // Uniqueness validation within hostel
    const validation = await checkHostelUniqueIdentifiers(
      hostelId,
      {
        phone,
        email,
        id_number: aadhaar_number
      }
    );

    if (!validation.isUnique) {
      return res.status(409).json({
        success: false,
        error: `The ${validation.conflictField} is already registered to a ${validation.conflictEntity} in this hostel.`
      });
    }

    const [staff_id] = await db('staff').insert({
      hostel_id: hostelId,
      full_name,
      phone,
      email: email || null,
      role: role || 'Staff',
      status: status !== undefined ? status : 1,
      join_date: join_date || new Date(),
      monthly_salary: monthly_salary || 0,
      aadhaar_number: aadhaar_number || null,
      photo: finalPhoto,
      aadhaar_front: finalFront,
      aadhaar_back: finalBack,
      notes: notes || null,
      created_at: new Date(),
      updated_at: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      data: { staff_id }
    });
  } catch (error: any) {
    console.error('Create staff error:', error);
    res.status(500).json({
      success: false,
      error: error?.sqlMessage || error?.message || 'Failed to create staff member'
    });
  }
};

// Update staff
export const updateStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId } = req.params;
    const user = req.user;
    const staff = await db('staff').where('staff_id', staffId).first();

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    if (!canAccessHostel(user, staff.hostel_id)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

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

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let finalPhoto = photo;
    let finalFront = aadhaar_front;
    let finalBack = aadhaar_back;

    if (files?.photo?.[0] || files?.profile_photo?.[0]) {
      const file = files.photo?.[0] || files.profile_photo?.[0];
      finalPhoto = await processFileUpload(file, 'avatars');
    }
    if (files?.aadhaar_front?.[0] || files?.id_proof_front?.[0]) {
      const file = files.aadhaar_front?.[0] || files.id_proof_front?.[0];
      finalFront = await processFileUpload(file, 'id_proofs');
    }
    if (files?.aadhaar_back?.[0] || files?.id_proof_back?.[0]) {
      const file = files.aadhaar_back?.[0] || files.id_proof_back?.[0];
      finalBack = await processFileUpload(file, 'id_proofs');
    }

    const updateData: any = {
      updated_at: new Date()
    };

    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email || null;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (join_date !== undefined) updateData.join_date = join_date;
    if (monthly_salary !== undefined) updateData.monthly_salary = monthly_salary;
    if (aadhaar_number !== undefined) updateData.aadhaar_number = aadhaar_number || null;
    if (finalPhoto !== undefined) updateData.photo = finalPhoto;
    if (finalFront !== undefined) updateData.aadhaar_front = finalFront;
    if (finalBack !== undefined) updateData.aadhaar_back = finalBack;
    if (notes !== undefined) updateData.notes = notes;

    // Validate uniqueness if phone/email/aadhaar changed
    const checkingPhone = phone !== undefined ? phone : staff.phone;
    const checkingEmail = email !== undefined ? email : staff.email;
    const checkingIdNumber = aadhaar_number !== undefined ? aadhaar_number : staff.aadhaar_number;

    if (phone !== undefined || email !== undefined || aadhaar_number !== undefined) {
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
    if (!canAccessHostel(req.user, staff.hostel_id)) {
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
    if (!canAccessHostel(req.user, staff.hostel_id)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    if (!amount || Number(amount) <= 0 || !payment_date) {
      return res.status(400).json({ success: false, error: 'Required fields: amount, payment_date' });
    }

    // Derive for_month from payment_date if not provided
    const resolvedMonth = for_month || payment_date.substring(0, 7); // YYYY-MM

    let payment_id: any;
    try {
      const result = await db('staff_payments').insert({
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
      payment_id = Array.isArray(result) ? result[0] : result;
    } catch (insertErr: any) {
      console.warn('Full staff_payment insert failed, attempting minimal insert fallback:', insertErr?.message);
      // Fallback for minimal legacy schema
      const result = await db('staff_payments').insert({
        hostel_id: staff.hostel_id,
        staff_id: Number(staffId),
        amount: Number(amount),
        payment_date,
        days_worked: days_worked ? Number(days_worked) : null,
        payment_type: payment_type || 'Advance',
        note: [note, mode ? `Mode: ${mode}` : '', transaction_id ? `Txn: ${transaction_id}` : ''].filter(Boolean).join(' | ') || null,
        created_by: req.user?.user_id || null,
        created_at: new Date(),
      });
      payment_id = Array.isArray(result) ? result[0] : result;
    }

    // Also auto-sync into expenses table so it shows up in Hostel Expenses
    try {
      let salaryCat = await db('expense_categories')
        .where(function() {
          this.where('category_name', 'like', '%salary%')
            .orWhere('category_name', 'like', '%staff%')
            .orWhere('name', 'like', '%salary%')
            .orWhere('name', 'like', '%staff%');
        })
        .first();

      const categoryId = salaryCat?.category_id || salaryCat?.id || 1;

      await db('expenses').insert({
        hostel_id: staff.hostel_id,
        category_id: categoryId,
        expense_date: payment_date,
        amount: Number(amount),
        payment_mode_id: (mode?.toLowerCase() === 'upi' ? 2 : mode?.toLowerCase() === 'bank' ? 3 : 1),
        vendor_name: staff.full_name,
        description: `${payment_type || 'Advance'} to ${staff.full_name} (${resolvedMonth})`,
        bill_number: transaction_id || receipt_number || null,
        created_at: new Date()
      });
    } catch (expErr) {
      console.warn('Could not auto-insert expense for staff payment:', expErr);
    }

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
    if (!canAccessHostel(req.user, staff.hostel_id)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const monthlySalary = Number(staff.monthly_salary || 0);

    // Get all payments grouped by for_month
    const payments = await db('staff_payments')
      .where('staff_id', staffId)
      .orderBy('for_month', 'desc')
      .orderBy('payment_date', 'desc')
      .catch(() => []);

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
    if (!canAccessHostel(req.user, payment.hostel_id)) {
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

    if (!canAccessHostel(req.user, staff.hostel_id)) {
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
