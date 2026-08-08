import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendNotificationToHostelOwner, sendNotificationToStudent } from '../utils/notification.js';
import { kickUserFromRoomChat } from '../socket/index.js';
import { checkHostelUniqueIdentifiers } from '../utils/validation.js';
import { resolveScopedHostelId, resolveOwnerHostelId, canAccessHostel } from '../utils/scope.js';

// Helper function to convert ISO datetime string to date-only format (YYYY-MM-DD)
const convertToDateOnly = (dateValue: any): string | null => {
  if (!dateValue) return null;
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    // Extract date part from ISO string (YYYY-MM-DDTHH:mm:ss.sssZ -> YYYY-MM-DD)
    return dateValue.split('T')[0];
  }
  return dateValue;
};

// Check if email or phone already exists in the same hostel
export const checkUnique = async (req: AuthRequest, res: Response) => {
  try {
    const { phone, email, id_proof_number, studentId } = req.query;
    const hostelId = req.user?.hostel_id;
    if (!hostelId) return res.json({ success: true, phoneExists: false, emailExists: false, idProofExists: false });

    let phoneExists = false;
    let emailExists = false;
    let idProofExists = false;

    if (phone) {
      const validation = await checkHostelUniqueIdentifiers(
        hostelId,
        { phone: phone as string },
        studentId ? { entityType: 'student', entityId: studentId as string } : undefined
      );
      if (!validation.isUnique) phoneExists = true;
    }

    if (email) {
      const validation = await checkHostelUniqueIdentifiers(
        hostelId,
        { email: email as string },
        studentId ? { entityType: 'student', entityId: studentId as string } : undefined
      );
      if (!validation.isUnique) emailExists = true;
    }

    if (id_proof_number) {
      const validation = await checkHostelUniqueIdentifiers(
        hostelId,
        { id_number: id_proof_number as string },
        studentId ? { entityType: 'student', entityId: studentId as string } : undefined
      );
      if (!validation.isUnique) idProofExists = true;
    }

    return res.json({ success: true, phoneExists, emailExists, idProofExists });
  } catch (error) {
    console.error('Check unique error:', error);
    return res.status(500).json({ success: false, error: 'Failed to check uniqueness' });
  }
};

// Get all students (Owner sees only their hostel students)
export const getStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, status, search, page, limit, date, startDate, endDate } = req.query;
    const user = req.user;

    let query = db('students as s')
      .leftJoin('hostel_master as h', 's.hostel_id', 'h.hostel_id')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .select(
        's.*',
        'h.hostel_name',
        'r.room_number',
        's.admission_date as check_in_date'
      );

    // Owner (role 2): validate BOTH user_id AND hostel_id together in DB.
    // Admin/Super Admin (role 1): scoped to ?hostelId if given, otherwise global.
    const { hostelId: scopedHostelId, error: hostelError } = await resolveOwnerHostelId(user, hostelId as string | undefined);
    if (hostelError) {
      return res.status(403).json({ success: false, error: hostelError });
    }
    if (scopedHostelId) {
      query = query.where('s.hostel_id', scopedHostelId);
    }

    // Filter by unallocated (no room assigned)
    if (req.query.unallocated === 'true') {
      query = query.whereNull('s.room_id');
    }

    // Filter by admission pending (unpaid admission fee)
    if (req.query.admissionPending === 'true') {
      query = query.where('s.admission_status', 0).whereIn('s.status', [1, 2, 3]);
    }

    // Filter by status if provided
    if (status !== undefined) {
      query = query.where('s.status', status);
    }

    // Filter by search term
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.where(function () {
        this.whereRaw("CONCAT_WS(' ', s.first_name, s.last_name) LIKE ?", [searchTerm])
          .orWhere('s.first_name', 'like', searchTerm)
          .orWhere('s.last_name', 'like', searchTerm)
          .orWhere('s.phone', 'like', searchTerm)
          .orWhere('r.room_number', 'like', searchTerm);
      });
    }

    // Filter by specific date or range
    if (date) {
      query = query.whereRaw('DATE(s.admission_date) = ?', [date]);
    } else if (startDate && endDate) {
      query = query.whereRaw('DATE(s.admission_date) >= ? AND DATE(s.admission_date) <= ?', [startDate, endDate]);
    }

    // Filter: students on multi-month plans whose plan_end_date is within N days (default 15)
    // Used by dashboard "Plan Renewals" widget and PendingPayments renewal tab
    if (req.query.renewalDueSoon === 'true') {
      const daysAhead = parseInt(req.query.renewalDays as string || '15', 10);
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      query = query
        .where('s.fee_plan', '>', 1)
        .whereNotNull('s.plan_end_date')
        .whereRaw('DATE(s.plan_end_date) <= ?', [futureDateStr])
        .where('s.status', 1); // Only active students
    }

    // Pagination
    // Hard cap: callers that omit page/limit still get at most MAX_UNBOUNDED_LIMIT
    // rows instead of an unbounded full-table scan. A `truncated` flag in the
    // response tells callers they should add pagination to get the full set.
    const MAX_UNBOUNDED_LIMIT = 200;
    let truncated = false;
    let total: number | undefined = undefined;

    if (page && limit) {
      const p = parseInt(page as string);
      if (p === 1) {
        // Clone the query BEFORE adding limit/offset and count directly.
        // Avoid wrapping in db.from(query.as('sub')) which breaks on complex
        // queries with whereRaw / joins (generates invalid SQL in some DB modes).
        const countResult = await query.clone().clearSelect().count('s.student_id as count').first() as any;
        total = countResult ? parseInt(countResult.count as string) : 0;
      }

      const l = parseInt(limit as string);
      query = query.limit(l).offset((p - 1) * l);
    } else {
      // No pagination params — apply the hard cap so a large hostel doesn't
      // cause an OOM or multi-second response. Return at most MAX_UNBOUNDED_LIMIT rows.
      query = query.limit(MAX_UNBOUNDED_LIMIT + 1); // +1 to detect truncation
    }

    const students = await query.orderBy('s.created_at', 'desc');

    if (!page || !limit) {
      // Check if the sentinel row was returned (means more rows exist)
      if (students.length > MAX_UNBOUNDED_LIMIT) {
        students.pop(); // remove the sentinel extra row
        truncated = true;
      }
      total = students.length;
    }

    res.json({
      success: true,
      data: students,
      ...(total !== undefined ? { total } : {}),
      ...(truncated ? { truncated: true, hint: 'Use ?page=1&limit=N to paginate the full list' } : {}),
    });
  } catch (error: any) {
    console.error('Get students error:', error);
    console.error('Error details:', {
      message: error?.message,
      sql: error?.sql,
      code: error?.code,
      errno: error?.errno,
      stack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Get stats / counts of students by status
export const getStudentStats = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { hostelId } = req.query;

    // Owner: validate BOTH user_id AND hostel_id together in DB.
    // Admin/Super Admin: scoped to ?hostelId if given, otherwise global.
    const { hostelId: scopedHostelId, error: hostelError } = await resolveOwnerHostelId(user, hostelId as string | undefined);
    if (hostelError) {
      return res.status(403).json({ success: false, error: hostelError });
    }

    let statsQuery = db('students');
    if (scopedHostelId) {
      statsQuery = statsQuery.where('hostel_id', scopedHostelId);
    }

    const stats = await statsQuery
      .select(
        db.raw('count(*) as total'),
        db.raw('sum(case when status = 1 then 1 else 0 end) as active'),
        db.raw('sum(case when status = 0 then 1 else 0 end) as inactive'),
        db.raw('sum(case when status = 2 then 1 else 0 end) as prebooked'),
        db.raw('sum(case when status = 3 then 1 else 0 end) as qr_register'),
        db.raw('sum(case when status = 1 and room_id is null then 1 else 0 end) as unallocated'),
        db.raw('sum(case when admission_status = 0 and status in (1, 2, 3) then 1 else 0 end) as pendingAdmissions')
      )
      .first() as any;

    res.json({
      success: true,
      data: {
        total: parseInt(stats?.total || 0),
        active: parseInt(stats?.active || 0),
        inactive: parseInt(stats?.inactive || 0),
        prebooked: parseInt(stats?.prebooked || 0),
        qrRegister: parseInt(stats?.qr_register || 0),
        unallocated: parseInt(stats?.unallocated || 0),
        pendingAdmissions: parseInt(stats?.pendingAdmissions || 0)
      }
    });
  } catch (error: any) {
    console.error('Get student stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student stats'
    });
  }
};

// Get student by ID
export const getStudentById = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await db('students as s')
      .leftJoin('hostel_master as h', 's.hostel_id', 'h.hostel_id')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .select(
        's.*',
        'h.hostel_name',
        'r.room_number',
        's.admission_date as check_in_date'
      )
      .where('s.student_id', studentId)
      .first();

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    if (!canAccessHostel(req.user, student.hostel_id)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this student.'
      });
    }

    const payments = await db('fee_payments as fp')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .leftJoin('monthly_fees as mf', 'fp.fee_id', 'mf.fee_id')
      .where('fp.student_id', studentId)
      .select('fp.*', 'pm.payment_mode_name', 'mf.fee_month as payment_for_month')
      .orderBy('fp.payment_date', 'desc')
      .limit(10);

    // Get pending dues from monthly_fees
    const dues = await db('monthly_fees')
      .where({ student_id: studentId })
      .where('balance', '>', 0)
      .select('*');

    res.json({
      success: true,
      data: {
        ...student,
        payment_history: payments,
        pending_dues: dues
      }
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student'
    });
  }
};

// Create new student
export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const {
      first_name,
      last_name,
      date_of_birth,
      gender,
      phone,
      email,
      guardian_name,
      guardian_phone,
      guardian_relation,
      permanent_address,
      present_working_address,
      id_proof_type,
      id_proof_number,
      id_proof_status,
      admission_date,
      admission_fee,
      admission_status,
      status,
      room_id,
      bed_id,
      bed_number,
      floor_number,
      monthly_rent,
      refundable_deposit,
      is_old_student,
      fee_plan,
      plan_start_date,
      plan_end_date,
      plan_amount
    } = req.body;

    // Determine hostel_id: Owner always uses their own hostel; Admin/Super Admin
    // must specify it explicitly (never silently defaults to the admin's own hostel_id).
    let hostel_id: number;
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel. Please contact administrator.'
        });
      }
      hostel_id = user.hostel_id;
    } else if (user?.role_id === 1) {
      // Admin can specify hostel_id
      hostel_id = req.body.hostel_id;
      if (!hostel_id) {
        return res.status(400).json({
          success: false,
          error: 'Admin must specify hostel_id'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to create students'
      });
    }

    // Validate required fields
    if (!first_name || !phone || !admission_date || !gender || admission_fee === undefined || admission_status === undefined || admission_status === null) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: first_name, gender, phone, admission_date, admission_fee, admission_status'
      });
    }

    // Validate id_proof_type if provided
    if (id_proof_type) {
      const proofType = await db('id_proof_types').where({ id: id_proof_type }).first();
      if (!proofType) {
        return res.status(400).json({
          success: false,
          error: `Invalid id_proof_type: ${id_proof_type}. Must be a valid ID from id_proof_types table.`
        });
      }
    }

    // Validate guardian_relation if provided
    if (guardian_relation) {
      const relation = await db('relations_master').where({ relation_id: guardian_relation }).first();
      if (!relation) {
        return res.status(400).json({
          success: false,
          error: `Invalid guardian_relation: ${guardian_relation}. Must be a valid ID from relations_master table.`
        });
      }
    }

    // Check if phone, email, or id_proof_number already exist in the same hostel
    const validation = await checkHostelUniqueIdentifiers(hostel_id, {
      phone,
      email,
      id_number: id_proof_number
    });

    if (!validation.isUnique) {
      return res.status(409).json({
        success: false,
        error: `The ${validation.conflictField} is already registered to a ${validation.conflictEntity} in this hostel.`
      });
    }
    // If room allocation is provided, check room availability
    let roomDetails = null;
    if (room_id) {
      const room = await db('rooms').where({ room_id }).first();

      if (!room) {
        return res.status(404).json({
          success: false,
          error: 'Room not found'
        });
      }

      // Check if room belongs to the same hostel
      if (room.hostel_id !== hostel_id) {
        return res.status(400).json({
          success: false,
          error: 'Room does not belong to the selected hostel'
        });
      }

      // Check if room has capacity (using total_capacity from room_type if available)
      // For now, we'll skip capacity check since capacity column was removed
      // Room availability is now determined by available_beds calculation

      roomDetails = room;
    }

    // ── Fee Plan: compute plan_end_date if a multi-month plan is chosen ────────
    const resolvedFeePlan: number = fee_plan ? Number(fee_plan) : 1;
    const admDateObj = admission_date ? new Date(admission_date) : new Date();
    let resolvedPlanStart: string | null = convertToDateOnly(plan_start_date || admission_date);
    let resolvedPlanEnd: string | null = null;
    if (resolvedFeePlan > 1) {
      // Auto-calculate end date: start + plan months, same day of month
      const endDate = new Date(admDateObj);
      endDate.setMonth(endDate.getMonth() + resolvedFeePlan);
      resolvedPlanEnd = plan_end_date ? convertToDateOnly(plan_end_date) : endDate.toISOString().split('T')[0];
    }
    const resolvedPlanAmount: number | null = plan_amount ? Number(plan_amount) : null;

    // Insert student
    // Convert boolean/status values: id_proof_status, admission_status, status are now TINYINT (0/1)
    const [student_id] = await db('students').insert({
      hostel_id,
      first_name,
      last_name,
      date_of_birth: convertToDateOnly(date_of_birth),
      gender,
      phone,
      email,
      guardian_name,
      guardian_phone,
      guardian_relation,
      permanent_address,
      present_working_address,
      id_proof_type,
      id_proof_number,
      id_proof_status: typeof id_proof_status === 'number' ? id_proof_status : (id_proof_status === 'Submitted' ? 1 : 0),
      admission_date: convertToDateOnly(admission_date),
      admission_fee: admission_fee || 0,
      refundable_deposit: refundable_deposit || 0,
      is_old_student: is_old_student ? 1 : 0,
      admission_status: typeof admission_status === 'number' ? admission_status : (admission_status === 'Paid' ? 1 : 0),
      status: typeof status === 'number' ? status : (status === 'Active' ? 1 : 0),
      room_id: room_id || null,
      bed_id: bed_id || null,
      bed_number: bed_number || null,
      monthly_rent: roomDetails ? roomDetails.rent_per_bed : (monthly_rent || 0),
      floor_number: floor_number || null,
      fee_plan: resolvedFeePlan,
      plan_start_date: resolvedPlanStart,
      plan_end_date: resolvedPlanEnd,
      plan_amount: resolvedPlanAmount,
      created_at: new Date()
    });

    const studentStatus = typeof status === 'number' ? status : (status === 'Active' ? 1 : 0);
    const monthlyRent = roomDetails ? Number(roomDetails.rent_per_bed) : Number(monthly_rent || 0);

    // Update room occupied beds ONLY if a room is allocated and the student is Active.
    if (room_id && roomDetails && studentStatus === 1) {
      await db('rooms')
        .where({ room_id })
        .increment('occupied_beds', 1);
    }

    // BILLING RULE: a tenant goes on the rent roll ONLY when a room is allocated.
    // Room allocation is the trigger. Active + room + rent > 0 → create the current
    // month's fee so they appear in Pending Dues with a proper due date. Students
    // without a room are intentionally NOT billed and won't show in Pending Dues.
    if (room_id && roomDetails && studentStatus === 1 && monthlyRent > 0) {
      try {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Check if fee already exists for this month
        const existingFee = await db('monthly_fees')
          .where({
            student_id,
            fee_month: currentMonth
          })
          .first();

        if (!existingFee) {
          // Anniversary Billing: The first bill's due date is exactly their admission date.
          // For the month string, we use the month of their admission.
          const admissionDateObj = new Date(admission_date);
          let dueDate = new Date(admissionDateObj);
          
          // Current month is used for the fee_month label, but we align due_date
          // to match the exact day of admission.
          const feeYear = now.getFullYear();
          const feeMonth = now.getMonth();
          
          dueDate.setFullYear(feeYear);
          dueDate.setMonth(feeMonth);
          
          // Handle overflow for short months (e.g. admitted 31st, current month has 30 days)
          if (dueDate.getMonth() !== feeMonth) {
            dueDate = new Date(feeYear, feeMonth + 1, 0); // last day of short month
          }

          // For multi-month plans: set total_due to the full plan amount (e.g. ₹25,500),
          // but paid_amount is 0.00 and status is 4 ('Pending') until an actual payment is recorded.
          const isMultiMonthPlan = resolvedFeePlan > 1;
          const feeAmount = isMultiMonthPlan && resolvedPlanAmount ? resolvedPlanAmount : monthlyRent;

          await db('monthly_fees').insert({
            student_id,
            hostel_id,
            fee_month: currentMonth,
            fee_date: now.getMonth() + 1,
            monthly_rent: feeAmount,
            carry_forward: 0.00,
            total_due: feeAmount,
            paid_amount: 0.00,
            balance: feeAmount,
            fee_status_id: 4, // 4='Pending'
            due_date: isMultiMonthPlan ? (resolvedPlanEnd || dueDate) : dueDate,
            notes: isMultiMonthPlan
              ? `${resolvedFeePlan}-Month Plan (${resolvedFeePlan === 3 ? 'Quarterly' : resolvedFeePlan === 6 ? 'Half-Yearly' : 'Yearly'}) — Auto-created on registration`
              : 'Auto-created on student registration',
            created_at: new Date(),
            updated_at: new Date()
          });

          console.log(`[createStudent] Auto-created monthly fee for student ${student_id}, month: ${currentMonth}, due: ${dueDate.toISOString().split('T')[0]}`);
        }
      } catch (feeError) {
        // Log error but don't fail student creation
        console.error('[createStudent] Error auto-creating monthly fee:', feeError);
      }
    }

    // NOTE: Admission fee is tracked on the student record itself (admission_fee + admission_status).
    // We do NOT insert into fee_payments here because fee_payments.fee_id is NOT NULL
    // and admission fees don't have a corresponding monthly_fee record.
    // Admission fee tracking is handled separately on the student profile.
    console.log(`[createStudent] Student ${student_id} created. Admission fee: ${req.body.admission_fee}, Status: ${req.body.admission_status}`);

    // Trigger push and in-app notification to owner
    sendNotificationToHostelOwner(
      hostel_id,
      'New Admission',
      'New Student Admission',
      `Student ${first_name} ${last_name || ''} has been registered successfully.`,
      'Medium',
      { id: student_id }
    ).catch(err => console.error('Failed to send student admission notification:', err));

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: { student_id }
    });
  } catch (error: any) {
    console.error('Create student error:', error);
    
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'This phone number or email is already registered.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to register student'
    });
  }
};

// Update student
export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { room_id, monthly_rent } = req.body;
    const updateData: any = { updated_at: new Date() };

    // Get student data early (needed for status and room tracking)
    const student = await db('students').where({ student_id: studentId }).first();

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    if (!canAccessHostel(req.user, student.hostel_id)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this student.'
      });
    }

    // Store original values for room bed count management
    const oldStatus = student.status;
    const oldRoomId = student.room_id;

    // Validate id_proof_type if being updated
    if (req.body.id_proof_type !== undefined && req.body.id_proof_type !== null) {
      const proofType = await db('id_proof_types').where({ id: req.body.id_proof_type }).first();
      if (!proofType) {
        return res.status(400).json({
          success: false,
          error: `Invalid id_proof_type: ${req.body.id_proof_type}. Must be a valid ID from id_proof_types table.`
        });
      }
    }

    // Validate guardian_relation if being updated
    if (req.body.guardian_relation !== undefined && req.body.guardian_relation !== null) {
      const relation = await db('relations_master').where({ relation_id: req.body.guardian_relation }).first();
      if (!relation) {
        return res.status(400).json({
          success: false,
          error: `Invalid guardian_relation: ${req.body.guardian_relation}. Must be a valid ID from relations_master table.`
        });
      }
    }

    // Allow updating specific fields
    const allowedFields = [
      'first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'email',
      'guardian_name', 'guardian_phone', 'guardian_relation',
      'permanent_address', 'present_working_address',
      'id_proof_type', 'id_proof_number', 'id_proof_status',
      'admission_date', 'admission_fee', 'admission_status', 'status', 'floor_number',
      'vacate_notice_date', 'vacate_notice_reason', 'bed_id', 'refundable_deposit', 'is_old_student',
      'fee_plan', 'plan_start_date', 'plan_end_date', 'plan_amount'
    ];

    // Check uniqueness within the same hostel if any identifying fields are being updated
    const checkingPhone = req.body.phone !== undefined ? req.body.phone : undefined;
    const checkingEmail = req.body.email !== undefined ? req.body.email : undefined;
    const checkingIdNumber = req.body.id_proof_number !== undefined ? req.body.id_proof_number : undefined;
    
    if (checkingPhone || checkingEmail || checkingIdNumber) {
      const validation = await checkHostelUniqueIdentifiers(
        student.hostel_id,
        {
          phone: checkingPhone,
          email: checkingEmail,
          id_number: checkingIdNumber
        },
        { entityType: 'student', entityId: studentId }
      );

      if (!validation.isUnique) {
        return res.status(409).json({
          success: false,
          error: `The ${validation.conflictField} is already registered to a ${validation.conflictEntity} in this hostel.`
        });
      }
    }

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        // Handle date fields - convert ISO datetime strings to date-only format
        if (field === 'admission_date' || field === 'date_of_birth' || field === 'vacate_notice_date') {
          updateData[field] = convertToDateOnly(req.body[field]);
        } else if (field === 'is_old_student') {
          updateData[field] = req.body[field] ? 1 : 0;
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    // Handle status changes and inactive_date
    // status is now stored as TINYINT: 1 = Active, 0 = Inactive
    if (req.body.status !== undefined) {
      const isInactive = req.body.status === 0 || req.body.status === 'Inactive';
      const isActive = req.body.status === 1 || req.body.status === 'Active';

      if (isInactive) {
        // Set inactive_date to current date when marking student as inactive
        // Only set if student was previously active (to avoid overwriting existing date)
        if (oldStatus === 1 || oldStatus === 'Active') {
          updateData.inactive_date = new Date();
        }

        // When changing to Inactive, ALWAYS clear room assignment
        // Inactive students should not have room assignments
        if (oldRoomId) {
          updateData.room_id = null;
          updateData.monthly_rent = null;
          updateData.bed_id = null;
        }
        // Convert to 0
        updateData.status = 0;
      } else if (isActive) {
        // Clear inactive_date when reactivating student
        updateData.inactive_date = null;

        // If student was previously inactive, update admission_date to current date (re-admission)
        if (oldStatus === 0 || oldStatus === 'Inactive') {
          updateData.admission_date = new Date();
        }
        // Convert to 1
        updateData.status = 1;
      }
    }

    // Handle monthly_rent update if provided
    if (monthly_rent !== undefined && monthly_rent !== null) {
      updateData.monthly_rent = monthly_rent;
    }

    // INVARIANT: assigning a real room always activates the tenant.
    // A room can never belong to an inactive student, and a pending mobile
    // registration (status = 3) is "accepted" precisely by being given a room.
    // This guards against the owner form sending status 0 for a status-3 tenant.
    if (room_id) {
      updateData.status = 1;
      updateData.inactive_date = null;
    }

    // Handle room allocation changes if room_id is provided
    // BUT: Don't allow room assignment if student is being set to Inactive
    const updateFinalStatus = updateData.status !== undefined ? updateData.status : oldStatus;
    if (room_id !== undefined && updateFinalStatus !== 0) {
      if (!room_id) {
        // room_id is null or empty - remove room assignment
        updateData.room_id = null;
        updateData.monthly_rent = null;
        updateData.bed_id = null;
      } else {
        // Validate and set new room
        const newRoom = await db('rooms').where({ room_id }).first();

        if (!newRoom) {
          return res.status(404).json({
            success: false,
            error: 'Room not found'
          });
        }

        // Check if room belongs to same hostel
        if (newRoom.hostel_id !== student.hostel_id) {
          return res.status(400).json({
            success: false,
            error: 'Room does not belong to student hostel'
          });
        }

        // Update student with new room information
        updateData.room_id = room_id;
        // Use provided monthly_rent or room's rent_per_bed
        if (monthly_rent === undefined || monthly_rent === null) {
          updateData.monthly_rent = newRoom.rent_per_bed;
        }

        // Update admission_date to current date when room is assigned/changed (if new room)
        if (!oldRoomId || oldRoomId !== room_id) {
          updateData.admission_date = new Date();
        }
      }
    }

    // Now perform the single database update with all changes
    await db('students')
      .where({ student_id: studentId })
      .update(updateData);

    // Handle room occupied_beds count changes AFTER student update
    // This ensures we have the correct status and room_id values

    // Get updated student to get final values
    const updatedStudent = await db('students').where({ student_id: studentId }).first();
    if (!updatedStudent) {
      return res.status(404).json({
        success: false,
        error: 'Student not found after update'
      });
    }

    const finalStatus = updatedStudent.status;
    const finalRoomId = updatedStudent.room_id;

    // Handle bed count changes based on status and room changes
    // Status is now TINYINT: 1 = Active, 0 = Inactive
    const oldStatusIsActive = oldStatus === 1 || oldStatus === 'Active';
    const finalStatusIsActive = finalStatus === 1 || finalStatus === 'Active';

    if (oldStatusIsActive && !finalStatusIsActive) {
      // Student became inactive - free up the bed
      if (oldRoomId) {
        try {
          await db('rooms')
            .where({ room_id: oldRoomId })
            .decrement('occupied_beds', 1);
          console.log(`Decremented occupied_beds for room ${oldRoomId} when student ${studentId} became inactive`);
          kickUserFromRoomChat(parseInt(studentId), oldRoomId);
        } catch (bedError: any) {
          console.error('Error decrementing room occupied_beds:', bedError);
        }
      }
    } else if (!oldStatusIsActive && finalStatusIsActive) {
      // Student became active - add bed if room is assigned
      if (finalRoomId) {
        try {
          await db('rooms')
            .where({ room_id: finalRoomId })
            .increment('occupied_beds', 1);
          console.log(`Incremented occupied_beds for room ${finalRoomId} when student ${studentId} became active`);
        } catch (bedError: any) {
          console.error('Error incrementing room occupied_beds:', bedError);
        }
      }
    } else if (finalStatusIsActive) {
      // Student is active - handle room changes
      if (oldRoomId && finalRoomId && oldRoomId !== finalRoomId) {
        // Student changed rooms
        try {
          await db('rooms')
            .where({ room_id: oldRoomId })
            .decrement('occupied_beds', 1);
          await db('rooms')
            .where({ room_id: finalRoomId })
            .increment('occupied_beds', 1);
          console.log(`Student ${studentId} moved from room ${oldRoomId} to ${finalRoomId}`);
          kickUserFromRoomChat(parseInt(studentId), oldRoomId);
        } catch (bedError: any) {
          console.error('Error updating room occupied_beds:', bedError);
        }

      } else if (!oldRoomId && finalRoomId) {
        // Student was assigned a new room
        try {
          await db('rooms')
            .where({ room_id: finalRoomId })
            .increment('occupied_beds', 1);
          console.log(`Assigned room ${finalRoomId} to student ${studentId}`);
        } catch (bedError: any) {
          console.error('Error incrementing room occupied_beds:', bedError);
        }
      } else if (oldRoomId && !finalRoomId) {
        // Student's room was removed
        try {
          await db('rooms')
            .where({ room_id: oldRoomId })
            .decrement('occupied_beds', 1);
          console.log(`Removed room ${oldRoomId} from student ${studentId}`);
        } catch (bedError: any) {
          console.error('Error decrementing room occupied_beds:', bedError);
        }
      }
    }

    // Sync current month's fee record if rent or room changed
    const currentMonth = new Date().toISOString().slice(0, 7);
    const updatedStatus = updatedStudent.status;
    const updatedRent = updatedStudent.monthly_rent;

    if (finalStatusIsActive && updatedRent) {
      try {
        const existingFee = await db('monthly_fees')
          .where({ student_id: studentId, fee_month: currentMonth })
          .first();

        if (existingFee) {
          const newTotalDue = parseFloat(updatedRent) + parseFloat(existingFee.carry_forward || 0);
          const newBalance = Math.max(0, newTotalDue - parseFloat(existingFee.paid_amount || 0));

          let newStatusId = 4;
          if (newBalance <= 0) newStatusId = 2;
          else if (parseFloat(existingFee.paid_amount || 0) > 0) newStatusId = 3;

          await db('monthly_fees')
            .where({ fee_id: existingFee.fee_id })
            .update({
              monthly_rent: updatedRent,
              total_due: newTotalDue,
              balance: newBalance,
              fee_status_id: newStatusId,
              updated_at: new Date()
            });
          console.log(`[updateStudent] Updated current month fee for student ${studentId} to match new rent: ${updatedRent}`);
        } else {
          // Auto-create monthly fee for current month on check-in/activation
          const now = new Date();
          let calculatedDueDate = now;
          if (updatedStudent.admission_date) {
            const admDate = new Date(updatedStudent.admission_date);
            const admDay = admDate.getDate();
            calculatedDueDate = new Date(now.getFullYear(), now.getMonth(), admDay);
            // Handle month overflow (e.g. Feb 31 -> Mar 3)
            if (calculatedDueDate.getMonth() !== now.getMonth()) {
              calculatedDueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }
          }

          await db('monthly_fees').insert({
            student_id: studentId,
            hostel_id: updatedStudent.hostel_id,
            fee_month: currentMonth,
            fee_date: now.getMonth() + 1,
            monthly_rent: updatedRent,
            carry_forward: 0.00,
            total_due: updatedRent,
            paid_amount: 0.00,
            balance: updatedRent,
            fee_status_id: 4, // 'Pending'
            due_date: calculatedDueDate,
            notes: 'Auto-created on student activation',
            created_at: new Date(),
            updated_at: new Date()
          });
          console.log(`[updateStudent] Auto-created current month fee for student ${studentId}: ${updatedRent}`);
        }
      } catch (feeError) {
        console.error('[updateStudent] Error syncing monthly fee:', feeError);
      }
    }

    res.json({
      success: true,
      message: 'Student updated successfully'
    });
  } catch (error: any) {
    console.error('Update student error:', error);
    console.error('Error details:', {
      message: error?.message,
      sql: error?.sql,
      code: error?.code,
      errno: error?.errno,
      stack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update student',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Delete student (hard delete - only for inactive students)
export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    // Get student to verify they exist and are inactive
    const student = await db('students').where({ student_id: studentId }).first();

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    if (!canAccessHostel(req.user, student.hostel_id)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this student.'
      });
    }

    // Only allow deletion of inactive or QR signup students
    if (student.status !== 0 && student.status !== 3 && student.status !== 'Inactive') {
      return res.status(400).json({
        success: false,
        error: 'Only inactive students can be deleted. Please mark the student as inactive first.'
      });
    }

    // Delete all related data first (to avoid foreign key constraints)
    // Delete fee payments
    await db('fee_payments')
      .where({ student_id: studentId })
      .del();

    // Delete monthly fees
    await db('monthly_fees')
      .where({ student_id: studentId })
      .del();

    // Finally, delete the student record permanently
    await db('students')
      .where({ student_id: studentId })
      .del();

    console.log(`Permanently deleted student ${studentId} (${student.first_name} ${student.last_name}) and all related data`);

    res.json({
      success: true,
      message: 'Student and all related data deleted permanently'
    });
  } catch (error: any) {
    console.error('Delete student error:', error);
    console.error('Error details:', {
      message: error?.message,
      sql: error?.sql,
      code: error?.code,
      errno: error?.errno,
      stack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete student',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Allocate/Change room for student
export const allocateRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { room_id } = req.body;

    if (!room_id) {
      return res.status(400).json({
        success: false,
        error: 'Room ID is required'
      });
    }

    const student = await db('students').where({ student_id: studentId }).first();

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    if (!canAccessHostel(req.user, student.hostel_id)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this student.'
      });
    }

    const room = await db('rooms').where({ room_id }).first();

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    if (Number(room.hostel_id) !== Number(student.hostel_id)) {
      return res.status(400).json({
        success: false,
        error: 'Room does not belong to student hostel'
      });
    }

    // Was the student already counted in occupancy before this allocation?
    // status is TINYINT: 1 = Active, 0 = Inactive (3 = pending mobile registration)
    const wasStudentActive = student.status === 1 || student.status === 'Active';
    const oldRoomId = student.room_id;

    // If student had a previous room, decrement its occupied beds
    // (only if they were already counted, i.e. previously active).
    if (oldRoomId && wasStudentActive) {
      await db('rooms')
        .where({ room_id: oldRoomId })
        .decrement('occupied_beds', 1);
      
      kickUserFromRoomChat(parseInt(studentId), oldRoomId);
    }

    // Update student with new room. Allocating a room activates the tenant —
    // this accepts a pending (status 3) mobile registration.
    await db('students')
      .where({ student_id: studentId })
      .update({
        room_id: room_id,
        monthly_rent: room.rent_per_bed,
        status: 1,
        inactive_date: null,
        admission_date: new Date(), // Update admission_date when room is allocated
        updated_at: new Date()
      });

    // The tenant is now active in this room — count the bed.
    await db('rooms')
      .where({ room_id })
      .increment('occupied_beds', 1);

    // Send push notification to tenant
    sendNotificationToStudent(
      parseInt(studentId),
      'System Alert',
      'Room Allocated!',
      `You have been assigned to room ${room.room_number}. You now have full access to the hostel app.`
    ).catch(err => console.error('Failed to send room allocation notification:', err));

    res.json({
      success: true,
      message: 'Room allocated successfully'
    });
  } catch (error) {
    console.error('Allocate room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to allocate room'
    });
  }
};

// ─── Reject a pending mobile self-registration (status=3, never allocated a room) ─
export const rejectRegistration = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { reason } = req.body;

    const student = await db('students').where({ student_id: studentId }).first();

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    if (!canAccessHostel(req.user, student.hostel_id)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this student.'
      });
    }

    if (student.status !== 3) {
      return res.status(400).json({
        success: false,
        error: 'Only pending registrations can be rejected'
      });
    }

    await db('students')
      .where({ student_id: studentId })
      .update({
        status: 4, // Rejected
        updated_at: new Date()
      });

    sendNotificationToStudent(
      parseInt(studentId),
      'General',
      'Registration Not Approved',
      reason || 'Your registration request was not approved by the hostel owner.',
      'High'
    ).catch(err => console.error('Failed to send registration-rejected notification:', err));

    res.json({
      success: true,
      message: 'Registration rejected'
    });
  } catch (error) {
    console.error('Reject registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject registration'
    });
  }
};

// ─── Get tenants who self-registered via mobile (status=3) — for owner dashboard ─
export const getPendingRegistrations = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role_id !== 1 && user.role_id !== 2)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    if (!user.hostel_id) {
      return res.status(403).json({ success: false, error: 'Account not linked to hostel' });
    }

    const requestedHostelId = req.query.hostelId ? Number(req.query.hostelId) : null;
    let targetHostelId = user.hostel_id;
    if (user.role_id === 1 && requestedHostelId) {
      targetHostelId = requestedHostelId;
    } else if (user.role_id === 2 && requestedHostelId) {
      const ownerHostels = await db('hostel_master')
        .where('owner_id', user.user_id)
        .select('hostel_id');
      const ids = ownerHostels.map(h => Number(h.hostel_id));
      if (ids.includes(requestedHostelId)) {
        targetHostelId = requestedHostelId;
      }
    }

    const pending = await db('students as s')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .where('s.hostel_id', targetHostelId)
      .where('s.status', 3) // status 3 = QR/Mobile registered, awaiting owner activation
      .select(
        's.student_id',
        's.first_name',
        's.last_name',
        's.phone',
        's.email',
        's.gender',
        's.created_at',
        's.room_id',
        'r.room_number',
      )
      .orderBy('s.created_at', 'desc');

    return res.json({
      success: true,
      count: pending.length,
      data: pending,
    });
  } catch (error: any) {
    console.error('getPendingRegistrations error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch pending registrations' });
  }
};

export const submitVacateNotice = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role_id !== 3) {
      return res.status(403).json({ success: false, error: 'Only tenants can submit a vacate notice.' });
    }

    const { date, reason } = req.body;

    // If date is null, it means cancelling the vacate notice
    const formattedDate = date ? (typeof date === 'string' ? date.split('T')[0] : date) : null;

    const student = await db('students').where('student_id', user.user_id).first();

    await db('students')
      .where('student_id', user.user_id)
      .update({
        vacate_notice_date: formattedDate,
        vacate_notice_reason: reason || null,
        vacate_reminder_sent: 0, // re-arm the upcoming-vacancy forecast for the new/cleared date
        updated_at: new Date()
      });

    if (student?.hostel_id) {
      const name = `${student.first_name}${student.last_name ? ' ' + student.last_name : ''}`;
      sendNotificationToHostelOwner(
        student.hostel_id,
        'General',
        formattedDate ? 'Vacate Notice Received' : 'Vacate Notice Cancelled',
        formattedDate
          ? `${name} has given notice to vacate on ${formattedDate}.${reason ? ` Reason: ${reason}` : ''}`
          : `${name} has cancelled their vacate notice.`,
        'Medium',
        { student_id: user.user_id }
      ).catch(err => console.error('Failed to send vacate-notice owner notification:', err));
    }

    return res.json({
      success: true,
      message: formattedDate ? 'Vacate notice submitted successfully.' : 'Vacate notice cancelled.'
    });
  } catch (error) {
    console.error('Submit vacate notice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit vacate notice'
    });
  }
};

export const vacateSettlement = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { damageDeductions = 0, customDeductionReason = 'Damages' } = req.body;
    
    // Begin transaction
    await db.transaction(async (trx) => {
      const student = await trx('students').where({ student_id: studentId }).first();
      if (!student) {
        throw new Error('Student not found');
      }

      if (!canAccessHostel(req.user, student.hostel_id)) {
        throw new Error('FORBIDDEN: You do not have access to this student.');
      }

      // Calculate pending rent dues
      const pendingDuesQuery = await trx('monthly_fees')
        .where({ student_id: studentId })
        .whereIn('fee_status_id', [4, 5]) // Pending, Partial
        .sum('balance as total_dues')
        .first();
        
      const pendingDues = Number(pendingDuesQuery?.total_dues || 0);
      const originalDeposit = Number(student.refundable_deposit || 0);
      
      const refundAmount = originalDeposit - pendingDues - Number(damageDeductions);
      
      // If there are damages, record it as income (Damage Recovery)
      // If there are damages, record it as income (Damage Recovery)
      if (Number(damageDeductions) > 0) {
        await trx('income').insert({
          hostel_id: student.hostel_id,
          amount: Number(damageDeductions),
          source: `Deposit Deduction (${student.first_name}) - ${customDeductionReason}`,
          income_date: new Date(),
          created_at: new Date()
        });
      }

      // If there is a refund to be given back to the student, record it as an expense automatically
      if (refundAmount > 0) {
        let refundCat = await trx('expense_categories').where({ category_name: 'Deposit Refunds' }).first();
        if (!refundCat) {
          // Fallback if category_name column name is different
          refundCat = await trx('expense_categories').where({ name: 'Deposit Refunds' }).first().catch(() => null);
        }
        
        let categoryId = refundCat?.category_id || refundCat?.id;
        
        if (!categoryId) {
          // We will just insert it without category, or create a category if possible
          // In some schemas it is 'category_name', in others 'name'. Let's use a safe raw insert or default to 1 (usually 'Others').
          categoryId = 1; // Fallback category (e.g., General or Others)
        }

        await trx('expenses').insert({
          hostel_id: student.hostel_id,
          category_id: categoryId,
          expense_date: new Date(),
          amount: refundAmount,
          payment_mode_id: 1, // Defaulting to Cash
          vendor_name: student.first_name,
          description: `Refunded Deposit to ${student.first_name} on vacate`,
          created_at: new Date()
        });
      }
      
      // Mark student as inactive (vacated), clear deposit, remove from room
      const oldRoomId = student.room_id;
      
      await trx('students')
        .where({ student_id: studentId })
        .update({
          status: 0, // Inactive
          inactive_date: new Date(),
          room_id: null, // Remove from room
          bed_id: null,
          bed_number: null,
          refundable_deposit: 0, // Deposit is settled
          updated_at: new Date()
        });
        
      // Decrement room occupancy
      if (oldRoomId && (student.status === 1 || student.status === 'Active')) {
        await trx('rooms')
          .where({ room_id: oldRoomId })
          .decrement('occupied_beds', 1);
      }
      
      // We could optionally clear their Pending rent dues here, or leave them as unpaid bad debt.
      // We will leave them so history is maintained, but the deposit offset the owner's loss.
    });

    res.json({
      success: true,
      message: 'Student vacated and settlement complete.'
    });
  } catch (error: any) {
    console.error('Vacate settlement error:', error);
    const isForbidden = typeof error?.message === 'string' && error.message.startsWith('FORBIDDEN:');
    res.status(isForbidden ? 403 : 500).json({
      success: false,
      error: isForbidden ? error.message.replace('FORBIDDEN: ', '') : (error.message || 'Failed to process vacate settlement')
    });
  }
};
