import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// Get all fee payments
export const getFeePayments = async (req: AuthRequest, res: Response) => {
  console.log('[getFeePayments] Request received');
  console.log('[getFeePayments] Query params:', req.query);
  console.log('[getFeePayments] User:', req.user);
  try {
    const { hostelId, studentId, startDate, endDate } = req.query;
    const user = req.user;
    console.log('[getFeePayments] Filters - hostelId:', hostelId, 'studentId:', studentId, 'user.role_id:', user?.role_id, 'user.hostel_id:', user?.hostel_id);

    let query = db('fee_payments as fp')
      .leftJoin('students as s', 'fp.student_id', 's.student_id')
      .leftJoin('hostel_master as h', 'fp.hostel_id', 'h.hostel_id')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .leftJoin('monthly_fees as mf', 'fp.fee_id', 'mf.fee_id')
      .select(
        'fp.payment_id',
        'fp.fee_id',
        'fp.student_id',
        'fp.hostel_id',
        'fp.amount as amount_paid',
        'fp.payment_date',
        'fp.transaction_id as transaction_reference',
        'fp.receipt_number',
        'fp.notes as remarks',
        'fp.created_at',
        'fp.verification_status',
        'fp.proof_url',
        'mf.fee_month as payment_for_month',
        's.first_name',
        's.last_name',
        's.phone',
        'h.hostel_name',
        'pm.payment_mode_name as payment_mode'
      );

    // If user is hostel owner, filter by their current hostel from JWT
    if ((user?.role_id === 2 || (user?.role_id === 1 && user?.hostel_id))) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('fp.hostel_id', user.hostel_id);
    }

    // Apply filters
    if (hostelId) {
      query = query.where('fp.hostel_id', hostelId);
    }

    if (studentId) {
      query = query.where('fp.student_id', studentId);
    }

    if (startDate && endDate) {
      query = query.whereBetween('fp.payment_date', [startDate, endDate]);
    }

    console.log('[getFeePayments] Executing query...');
    const payments = await query.orderBy('fp.payment_date', 'desc');
    console.log(`[getFeePayments] Query completed. Found ${payments.length} payment records`);

    res.json({
      success: true,
      data: payments
    });
    console.log('[getFeePayments] Response sent successfully');
  } catch (error: any) {
    console.error('[getFeePayments] Error:', error);
    console.error('[getFeePayments] Error details:', {
      message: error?.message,
      sql: error?.sql,
      code: error?.code,
      errno: error?.errno,
      stack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fee payments',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Get payment history for a specific student
export const getStudentPaymentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const user = req.user;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID is required'
      });
    }

    let query = db('fee_payments as fp')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .leftJoin('monthly_fees as mf', 'fp.fee_id', 'mf.fee_id')
      .select(
        'fp.payment_id',
        'fp.student_id',
        'fp.payment_date',
        'fp.amount as amount_paid',
        'mf.fee_month as payment_for_month',
        'fp.receipt_number',
        'fp.transaction_id as transaction_reference',
        'fp.notes as remarks',
        'fp.verification_status',
        'fp.proof_url',
        'pm.payment_mode_name as payment_mode'
      )
      .where('fp.student_id', studentId);

    // If user is hostel owner, filter by their current hostel from JWT
    if ((user?.role_id === 2 || (user?.role_id === 1 && user?.hostel_id))) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('fp.hostel_id', user.hostel_id);
    }

    const payments = await query
      .orderBy('fp.payment_date', 'desc')
      .orderBy('fp.payment_id', 'desc');

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get student payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student payment history'
    });
  }
};

// Record fee payment
export const recordPayment = async (req: AuthRequest, res: Response) => {
  try {
    const {
      student_id,
      hostel_id,
      amount_paid,
      payment_mode_id,
      due_date,
      payment_date,
      transaction_reference,
      remarks
    } = req.body;

    // Validate required fields
    if (!student_id || !hostel_id || !amount_paid || !payment_mode_id) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: student_id, hostel_id, amount_paid, payment_mode_id'
      });
    }

    // Generate receipt number
    const receiptNumber = `RCP${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Get or create monthly fee record for current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let monthlyFee = await db('monthly_fees')
      .where({ student_id, fee_month: currentMonth })
      .first();

    if (!monthlyFee) {
      // Create a monthly fee record if it doesn't exist
      const student = await db('students').where({ student_id }).first();
      const monthlyRent = parseFloat(student?.monthly_rent || 0);

      const [fee_id] = await db('monthly_fees').insert({
        student_id,
        hostel_id,
        fee_month: currentMonth,
        fee_date: now.getMonth() + 1,
        monthly_rent: monthlyRent,
        carry_forward: 0,
        total_due: monthlyRent,
        paid_amount: 0,
        balance: monthlyRent,
        fee_status: 'Pending',
        due_date: due_date || now,
        created_at: now,
        updated_at: now
      });

      monthlyFee = await db('monthly_fees').where({ fee_id }).first();
    }

    // Insert payment into fee_payments
    const [payment_id] = await db('fee_payments').insert({
      fee_id: monthlyFee.fee_id,
      student_id,
      hostel_id,
      amount: amount_paid,
      payment_date: payment_date || new Date(),
      payment_mode_id,
      transaction_id: transaction_reference,
      receipt_number: receiptNumber,
      notes: remarks,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Update monthly_fees paid_amount and balance
    const newPaidAmount = parseFloat(monthlyFee.paid_amount || 0) + parseFloat(amount_paid);
    const newBalance = parseFloat(monthlyFee.total_due || 0) - newPaidAmount;
    const newStatus = newBalance <= 0 ? 'Fully Paid' : newPaidAmount > 0 ? 'Partially Paid' : 'Pending';

    await db('monthly_fees')
      .where({ fee_id: monthlyFee.fee_id })
      .update({
        paid_amount: newPaidAmount,
        balance: Math.max(0, newBalance),
        fee_status: newStatus,
        updated_at: new Date()
      });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment_id,
        receipt_number: receiptNumber
      }
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record payment'
    });
  }
};

// Get payment modes
export const getPaymentModes = async (req: AuthRequest, res: Response) => {
  try {
    // Check if order_index column exists in the table
    const [columns] = await db.raw(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payment_modes'
      AND COLUMN_NAME = 'order_index'
    `);

    let paymentModes;

    if (columns && columns.length > 0) {
      // Order by order_index first (using COALESCE to handle NULLs), then by payment_mode_name
      paymentModes = await db('payment_modes')
        .select('*')
        .orderByRaw('COALESCE(order_index, 999999) ASC')
        .orderBy('payment_mode_name', 'asc');
    } else {
      // Fallback to payment_mode_name if order_index column doesn't exist
      paymentModes = await db('payment_modes')
        .select('*')
        .orderBy('payment_mode_name', 'asc');
    }

    res.json({
      success: true,
      data: paymentModes
    });
  } catch (error) {
    console.error('Get payment modes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment modes'
    });
  }
};

// Get payment receipt
export const getReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;

    const payment = await db('fee_payments as fp')
      .leftJoin('students as s', 'fp.student_id', 's.student_id')
      .leftJoin('hostel_master as h', 'fp.hostel_id', 'h.hostel_id')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .leftJoin('monthly_fees as mf', 'fp.fee_id', 'mf.fee_id')
      .select(
        'fp.payment_id',
        'fp.fee_id',
        'fp.student_id',
        'fp.hostel_id',
        'fp.amount as amount_paid',
        'fp.payment_date',
        'fp.transaction_id as transaction_reference',
        'fp.receipt_number',
        'fp.notes as remarks',
        'fp.created_at',
        'mf.fee_month as payment_for_month',
        's.first_name',
        's.last_name',
        's.phone',
        's.email',
        'h.hostel_name',
        'h.address',
        'h.city',
        'h.contact_number as hostel_contact',
        'pm.payment_mode_name as payment_mode',
        'r.room_number'
      )
      .where('fp.payment_id', paymentId)
      .first();

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    if (req.user?.hostel_id && payment.hostel_id !== req.user.hostel_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt'
    });
  }
};

// Get available months from monthly_fees
export const getAvailableMonths = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    let query = db('monthly_fees')
      .distinct('fee_month')
      .orderBy('fee_month', 'desc');

    // If user is hostel owner, filter by their hostel
    if ((user?.role_id === 2 || (user?.role_id === 1 && user?.hostel_id))) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('hostel_id', user.hostel_id);
    }

    const months = await query;

    res.json({
      success: true,
      data: months.map(m => m.fee_month)
    });
  } catch (error) {
    console.error('Get available months error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available months'
    });
  }
};

// Upload Payment Proof (Tenant)
export const uploadPaymentProof = async (req: AuthRequest, res: Response) => {
  try {
    const student_id = req.user?.user_id;
    const { amount_paid, payment_mode_id, transaction_reference } = req.body;
    
    if (!student_id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const student = await db('students').where('student_id', student_id).first();
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const proof_url = `/uploads/${req.file.filename}`;
    const receiptNumber = `RCP${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let monthlyFee = await db('monthly_fees').where({ student_id, fee_month: currentMonth }).first();

    if (!monthlyFee) {
      const monthlyRent = parseFloat(student?.monthly_rent || 0);
      const [fee_id] = await db('monthly_fees').insert({
        student_id,
        hostel_id: student.hostel_id,
        fee_month: currentMonth,
        fee_date: now.getMonth() + 1,
        monthly_rent: monthlyRent,
        carry_forward: 0,
        total_due: monthlyRent,
        paid_amount: 0,
        balance: monthlyRent,
        fee_status: 'Pending',
        due_date: now,
        created_at: now,
        updated_at: now
      });
      monthlyFee = await db('monthly_fees').where({ fee_id }).first();
    }

    const [payment_id] = await db('fee_payments').insert({
      fee_id: monthlyFee.fee_id,
      student_id,
      hostel_id: student.hostel_id,
      amount: amount_paid || 0,
      payment_date: now,
      payment_mode_id: payment_mode_id || null,
      transaction_id: transaction_reference || null,
      receipt_number: receiptNumber,
      verification_status: 'Pending',
      proof_url,
      created_at: now,
      updated_at: now
    });

    res.status(201).json({ success: true, message: 'Payment proof uploaded successfully', payment_id });
  } catch (error: any) {
    console.error('Upload payment proof error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─── GET Tenant's own fee history (called by mobile app) ─────────────────────
export const getTenantFeeHistory = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.user_id;
    if (!studentId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    // Monthly fee records for this tenant
    const fees = await db('monthly_fees as mf')
      .leftJoin('fee_payments as fp', 'fp.fee_id', 'mf.fee_id')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .where('mf.student_id', studentId)
      .select(
        'mf.fee_id',
        'mf.fee_month',
        'mf.monthly_rent',
        'mf.total_due',
        'mf.paid_amount',
        'mf.balance',
        'mf.fee_status',
        'mf.due_date',
        'fp.payment_id',
        'fp.amount as payment_amount',
        'fp.payment_date',
        'fp.transaction_id',
        'fp.receipt_number',
        'fp.verification_status',
        'fp.proof_url',
        'pm.payment_mode_name as payment_mode',
      )
      .orderBy('mf.fee_month', 'desc');

    // Group by fee_month so each month is one record with its payments
    const grouped: Record<string, any> = {};
    for (const row of fees) {
      if (!grouped[row.fee_id]) {
        grouped[row.fee_id] = {
          fee_id: row.fee_id,
          fee_month: row.fee_month,
          monthly_rent: Number(row.monthly_rent || 0),
          total_due: Number(row.total_due || 0),
          paid_amount: Number(row.paid_amount || 0),
          balance: Number(row.balance || 0),
          fee_status: row.fee_status,
          due_date: row.due_date,
          payments: [],
        };
      }
      if (row.payment_id) {
        grouped[row.fee_id].payments.push({
          payment_id: row.payment_id,
          amount: Number(row.payment_amount || 0),
          payment_date: row.payment_date,
          transaction_id: row.transaction_id,
          receipt_number: row.receipt_number,
          verification_status: row.verification_status,
          proof_url: row.proof_url,
          payment_mode: row.payment_mode,
        });
      }
    }

    return res.json({
      success: true,
      data: Object.values(grouped),
    });
  } catch (error: any) {
    console.error('getTenantFeeHistory error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch fee history' });
  }
};

// Verify Payment Proof (Owner)
export const verifyPaymentProof = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body; // 'Verified' or 'Rejected'

    if (!['Verified', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const payment = await db('fee_payments').where('payment_id', paymentId).first();
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    await db('fee_payments')
      .where('payment_id', paymentId)
      .update({ verification_status: status });

    if (status === 'Verified') {
      const monthlyFee = await db('monthly_fees').where('fee_id', payment.fee_id).first();
      if (monthlyFee) {
        const newPaidAmount = parseFloat(monthlyFee.paid_amount || 0) + parseFloat(payment.amount);
        const newBalance = parseFloat(monthlyFee.total_due || 0) - newPaidAmount;
        const newStatus = newBalance <= 0 ? 'Fully Paid' : newPaidAmount > 0 ? 'Partially Paid' : 'Pending';

        await db('monthly_fees')
          .where({ fee_id: monthlyFee.fee_id })
          .update({
            paid_amount: newPaidAmount,
            balance: Math.max(0, newBalance),
            fee_status: newStatus,
            updated_at: new Date()
          });
      }
    }

    res.status(200).json({ success: true, message: `Payment proof ${status}` });
  } catch (error: any) {
    console.error('Verify payment proof error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

