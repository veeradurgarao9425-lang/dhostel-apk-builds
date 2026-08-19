import { Request, Response } from 'express';
import db from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import { generateDeveloperToken, logDeveloperAction, DeveloperAuthRequest } from '../middleware/developerAuth.js';
import { generateToken } from '../utils/jwt.js';

export const developerController = {
  // ─── 1. AUTHENTICATION ───────────────────────────────────────────────────

  /**
   * Developer Login
   * Accepts username or email + password. Authenticates against developer_users.
   */
  async login(req: Request, res: Response) {
    try {
      const { identifier, password } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          error: 'Developer username/email and password are required',
        });
      }

      const devUser = await db('developer_users')
        .where('username', identifier)
        .orWhere('email', identifier)
        .first();

      if (!devUser) {
        return res.status(401).json({
          success: false,
          error: 'Invalid developer credentials.',
        });
      }

      if (devUser.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          error: `Developer account is ${devUser.status}. Contact system administrator.`,
        });
      }

      const isValidPassword = await comparePassword(password, devUser.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid developer credentials.',
        });
      }

      // Update last login timestamp
      await db('developer_users')
        .where('id', devUser.id)
        .update({ last_login_at: new Date() });

      // Generate signed token
      const token = generateDeveloperToken({
        developer_id: devUser.id,
        username: devUser.username,
        email: devUser.email,
        is_developer: true,
        role: 'DEVELOPER',
      });

      // Record Audit Log
      await logDeveloperAction({
        developer_id: devUser.id,
        developer_username: devUser.username,
        action: 'DEVELOPER_LOGIN',
        target_type: 'AUTH',
        target_id: devUser.id,
        metadata: { login_time: new Date() },
        req,
      });

      return res.json({
        success: true,
        message: 'Developer authenticated successfully',
        data: {
          developer: {
            id: devUser.id,
            username: devUser.username,
            email: devUser.email,
            full_name: devUser.full_name,
            role_title: devUser.role_title,
            status: devUser.status,
            last_login_at: devUser.last_login_at,
          },
          token,
        },
      });
    } catch (error: any) {
      console.error('Developer login error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during developer authentication',
      });
    }
  },

  /**
   * Developer Logout
   */
  async logout(req: DeveloperAuthRequest, res: Response) {
    try {
      if (req.developer) {
        await logDeveloperAction({
          developer_id: req.developer.id,
          developer_username: req.developer.username,
          action: 'DEVELOPER_LOGOUT',
          target_type: 'AUTH',
          target_id: req.developer.id,
          req,
        });
      }

      return res.json({
        success: true,
        message: 'Developer logged out successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Logout error: ' + error.message,
      });
    }
  },

  /**
   * Get Current Developer Profile & Active Session Stats
   */
  async me(req: DeveloperAuthRequest, res: Response) {
    try {
      const dev = req.developer!;

      const activeSessionsCount = await db('support_sessions')
        .where({ developer_id: dev.id, is_active: 1 })
        .andWhere('expires_at', '>', new Date())
        .count('id as count')
        .first();

      return res.json({
        success: true,
        data: {
          developer: dev,
          active_support_sessions: Number(activeSessionsCount?.count || 0),
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // ─── 2. DASHBOARD & PLATFORM OVERVIEW ────────────────────────────────────

  /**
   * Complete Platform Aggregated Metrics
   */
  async getDashboardMetrics(req: DeveloperAuthRequest, res: Response) {
    try {
      // 1. Hostels Metrics
      const totalHostelsRes = await db('hostel_master').count('hostel_id as total').first();
      const activeHostelsRes = await db('hostel_master').where('is_active', 1).count('hostel_id as total').first();
      const inactiveHostelsRes = await db('hostel_master').where('is_active', 0).count('hostel_id as total').first();

      const totalHostels = Number(totalHostelsRes?.total || 0);
      const activeHostels = Number(activeHostelsRes?.total || 0);
      const inactiveHostels = Number(inactiveHostelsRes?.total || 0);

      // 2. Owners Metrics
      const totalOwnersRes = await db('users').where('role_id', 2).count('user_id as total').first();
      const activeOwnersRes = await db('users').where({ role_id: 2, is_active: 1 }).count('user_id as total').first();
      const totalOwners = Number(totalOwnersRes?.total || 0);
      const activeOwners = Number(activeOwnersRes?.total || 0);

      // 3. Students Metrics
      const totalStudentsRes = await db('students').count('student_id as total').first();
      const activeStudentsRes = await db('students').where('status', 1).count('student_id as total').first();
      const totalStudents = Number(totalStudentsRes?.total || 0);
      const activeStudents = Number(activeStudentsRes?.total || 0);

      // 4. Rooms & Beds Metrics
      const roomsStats: any = await db('rooms')
        .select(
          db.raw('COUNT(room_id) as total_rooms'),
          db.raw('COALESCE(SUM(capacity), 0) as total_beds'),
          db.raw('COALESCE(SUM(occupied_beds), 0) as occupied_beds')
        )
        .first();

      const totalRooms = Number(roomsStats?.total_rooms || 0);
      const totalBeds = Number(roomsStats?.total_beds || 0);
      const occupiedBeds = Number(roomsStats?.occupied_beds || 0);
      const availableBeds = Math.max(0, totalBeds - occupiedBeds);

      // 5. Financial Overview
      let pendingFees = 0;
      try {
        const pendingFeesRes = await db('monthly_fees')
          .where('balance', '>', 0)
          .sum('balance as total')
          .first();
        pendingFees = Number(pendingFeesRes?.total || 0);
      } catch {
        const fallbackDue = await db('students').where('status', 1).sum('monthly_rent as total').first();
        pendingFees = Number(fallbackDue?.total || 0);
      }

      // Total Collections
      let totalCollected = 0;
      try {
        const collectedRes = await db('fee_payments').sum('amount as total').first();
        totalCollected = Number(collectedRes?.total || 0);
        if (totalCollected === 0) {
          const mfPaid = await db('monthly_fees').sum('paid_amount as total').first();
          totalCollected = Number(mfPaid?.total || 0);
        }
      } catch {
        const mfPaid = await db('monthly_fees').sum('paid_amount as total').first();
        totalCollected = Number(mfPaid?.total || 0);
      }

      // Total Expenses
      let totalExpenses = 0;
      try {
        const expensesRes = await db('expenses').sum('amount as total').first();
        totalExpenses = Number(expensesRes?.total || 0);
      } catch {
        totalExpenses = 0;
      }

      // 6. Recent Platform Activity & Audit Logs
      const recentAudit = await db('developer_audit_logs')
        .orderBy('created_at', 'desc')
        .limit(5);

      const recentHostels = await db('hostel_master')
        .select('hostel_id', 'hostel_name', 'city', 'state', 'created_at', 'is_active')
        .orderBy('created_at', 'desc')
        .limit(5);

      return res.json({
        success: true,
        data: {
          metrics: {
            total_hostels: totalHostels,
            active_hostels: activeHostels,
            inactive_hostels: inactiveHostels,
            total_owners: totalOwners,
            active_owners: activeOwners,
            total_students: totalStudents,
            active_students: activeStudents,
            total_rooms: totalRooms,
            total_beds: totalBeds,
            occupied_beds: occupiedBeds,
            available_beds: availableBeds,
            occupancy_rate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
            pending_fees: pendingFees,
            total_collected: totalCollected,
            total_expenses: totalExpenses,
          },
          recent_audit_logs: recentAudit,
          recent_hostels: recentHostels,
          system_status: {
            server: 'ONLINE',
            database: 'HEALTHY',
            timestamp: new Date(),
          },
        },
      });
    } catch (error: any) {
      console.error('getDashboardMetrics error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to aggregate dashboard metrics: ' + error.message,
      });
    }
  },

  // ─── 3. HOSTEL MANAGEMENT ────────────────────────────────────────────────

  /**
   * Get Paginated Hostels with Filtering & Live Stats
   */
  async getHostels(req: DeveloperAuthRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
      const offset = (page - 1) * limit;

      const search = (req.query.search as string || '').trim();
      const status = req.query.status as string; // 'ALL', 'ACTIVE', 'INACTIVE'
      const city = req.query.city as string;
      const ownerId = req.query.owner_id ? parseInt(req.query.owner_id as string, 10) : undefined;
      const sortBy = (req.query.sortBy as string || 'created_at').toLowerCase();
      const sortOrder = (req.query.sortOrder as string || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

      let query = db('hostel_master')
        .select(
          'hostel_master.hostel_id',
          'hostel_master.hostel_name',
          'hostel_master.hostel_code',
          'hostel_master.address',
          'hostel_master.city',
          'hostel_master.state',
          'hostel_master.pincode',
          'hostel_master.contact_number',
          'hostel_master.admission_fee',
          'hostel_master.is_active',
          'hostel_master.created_at',
          'users.user_id as owner_id',
          'users.full_name as owner_name',
          'users.email as owner_email',
          'users.phone as owner_phone'
        )
        .leftJoin('users', 'hostel_master.owner_id', 'users.user_id');

      if (search) {
        query = query.where((builder) => {
          builder
            .where('hostel_master.hostel_name', 'like', `%${search}%`)
            .orWhere('hostel_master.city', 'like', `%${search}%`)
            .orWhere('hostel_master.hostel_code', 'like', `%${search}%`)
            .orWhere('users.full_name', 'like', `%${search}%`)
            .orWhere('users.email', 'like', `%${search}%`)
            .orWhere('users.phone', 'like', `%${search}%`);
        });
      }

      if (status === 'ACTIVE') {
        query = query.where('hostel_master.is_active', 1);
      } else if (status === 'INACTIVE') {
        query = query.where('hostel_master.is_active', 0);
      }

      if (city) {
        query = query.where('hostel_master.city', 'like', `%${city}%`);
      }

      if (ownerId) {
        query = query.where('hostel_master.owner_id', ownerId);
      }

      // Count query
      const countRes = await query.clone().clearSelect().count('hostel_master.hostel_id as total').first();
      const total = Number(countRes?.total || 0);

      // Paginated records
      const hostels = await query
        .orderBy(`hostel_master.${sortBy === 'name' ? 'hostel_name' : 'created_at'}`, sortOrder)
        .limit(limit)
        .offset(offset);

      // Enrich hostels with room & student count
      const enrichedHostels = await Promise.all(
        hostels.map(async (h) => {
          const roomStats: any = await db('rooms')
            .where('hostel_id', h.hostel_id)
            .select(
              db.raw('COUNT(room_id) as total_rooms'),
              db.raw('COALESCE(SUM(capacity), 0) as total_beds'),
              db.raw('COALESCE(SUM(occupied_beds), 0) as occupied_beds')
            )
            .first();

          const studentCountRes = await db('students')
            .where({ hostel_id: h.hostel_id, status: 1 })
            .count('student_id as active_students')
            .first();

          const totalRooms = Number(roomStats?.total_rooms || 0);
          const totalBeds = Number(roomStats?.total_beds || 0);
          const occupiedBeds = Number(roomStats?.occupied_beds || 0);

          return {
            ...h,
            total_rooms: totalRooms,
            total_beds: totalBeds,
            occupied_beds: occupiedBeds,
            available_beds: Math.max(0, totalBeds - occupiedBeds),
            active_students: Number(studentCountRes?.active_students || 0),
          };
        })
      );

      return res.json({
        success: true,
        data: {
          hostels: enrichedHostels,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
          },
        },
      });
    } catch (error: any) {
      console.error('getHostels error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch hostels: ' + error.message,
      });
    }
  },

  /**
   * Get Complete Single Hostel Details (All Tabs)
   */
  async getHostelDetails(req: DeveloperAuthRequest, res: Response) {
    try {
      const hostelId = parseInt(req.params.id, 10);
      if (!hostelId) {
        return res.status(400).json({ success: false, error: 'Invalid hostel ID' });
      }

      // 1. Core Hostel Info
      const hostel = await db('hostel_master')
        .select('hostel_master.*', 'users.full_name as owner_name', 'users.email as owner_email', 'users.phone as owner_phone', 'users.is_active as owner_active', 'users.last_login as owner_last_login')
        .leftJoin('users', 'hostel_master.owner_id', 'users.user_id')
        .where('hostel_master.hostel_id', hostelId)
        .first();

      if (!hostel) {
        return res.status(404).json({ success: false, error: 'Hostel not found' });
      }

      // 2. Students List
      const students = await db('students')
        .select(
          'students.*',
          'rooms.room_number',
          'rooms.floor'
        )
        .leftJoin('rooms', 'students.room_id', 'rooms.room_id')
        .where('students.hostel_id', hostelId)
        .orderBy('students.created_at', 'desc')
        .limit(100);

      // 3. Rooms & Beds List
      const rooms = await db('rooms')
        .where('hostel_id', hostelId)
        .orderBy('room_number', 'asc');

      // 4. Payments
      const payments = await db('payments')
        .select('payments.*', 'students.first_name', 'students.last_name', 'students.phone')
        .leftJoin('students', 'payments.student_id', 'students.student_id')
        .where('payments.hostel_id', hostelId)
        .orderBy('payments.created_at', 'desc')
        .limit(50);

      // 5. Expenses
      let expenses: any[] = [];
      try {
        expenses = await db('expenses')
          .where('hostel_id', hostelId)
          .orderBy('expense_date', 'desc')
          .limit(50);
      } catch {}

      // 6. Notices
      let notices: any[] = [];
      try {
        notices = await db('notices')
          .where('hostel_id', hostelId)
          .orderBy('created_at', 'desc')
          .limit(30);
      } catch {}

      // 7. Complaints
      let complaints: any[] = [];
      try {
        complaints = await db('complaints')
          .select('complaints.*', 'students.first_name', 'students.last_name', 'students.phone')
          .leftJoin('students', 'complaints.student_id', 'students.student_id')
          .where('complaints.hostel_id', hostelId)
          .orderBy('complaints.created_at', 'desc')
          .limit(50);
      } catch {}

      // Summary Statistics
      const totalCapacity = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
      const totalOccupied = rooms.reduce((acc, r) => acc + (r.occupied_beds || 0), 0);

      await logDeveloperAction({
        developer_id: req.developer?.id,
        developer_username: req.developer?.username,
        action: 'DEVELOPER_VIEW_HOSTEL',
        target_type: 'HOSTEL',
        target_id: hostelId,
        hostel_id: hostelId,
        metadata: { hostel_name: hostel.hostel_name },
        req,
      });

      return res.json({
        success: true,
        data: {
          hostel,
          stats: {
            total_rooms: rooms.length,
            total_beds: totalCapacity,
            occupied_beds: totalOccupied,
            available_beds: Math.max(0, totalCapacity - totalOccupied),
            total_students: students.length,
            active_students: students.filter((s: any) => s.status === 1).length,
          },
          students,
          rooms,
          payments,
          expenses,
          notices,
          complaints,
        },
      });
    } catch (error: any) {
      console.error('getHostelDetails error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch hostel details: ' + error.message,
      });
    }
  },

  /**
   * Update Hostel Status (Active / Inactive / Suspended)
   */
  async updateHostelStatus(req: DeveloperAuthRequest, res: Response) {
    try {
      const hostelId = parseInt(req.params.id, 10);
      const { is_active, status_reason } = req.body;

      if (typeof is_active === 'undefined') {
        return res.status(400).json({ success: false, error: 'is_active boolean is required' });
      }

      await db('hostel_master')
        .where('hostel_id', hostelId)
        .update({
          is_active: is_active ? 1 : 0,
          updated_at: new Date(),
        });

      await logDeveloperAction({
        developer_id: req.developer?.id,
        developer_username: req.developer?.username,
        action: is_active ? 'DEVELOPER_ACTIVATE_HOSTEL' : 'DEVELOPER_DEACTIVATE_HOSTEL',
        target_type: 'HOSTEL',
        target_id: hostelId,
        hostel_id: hostelId,
        metadata: { is_active, reason: status_reason },
        req,
      });

      return res.json({
        success: true,
        message: `Hostel status updated to ${is_active ? 'Active' : 'Inactive'}`,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── 4. OWNER MANAGEMENT ─────────────────────────────────────────────────

  /**
   * Get Paginated Owners across Platform
   */
  async getOwners(req: DeveloperAuthRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
      const offset = (page - 1) * limit;
      const search = (req.query.search as string || '').trim();

      let query = db('users')
        .where('role_id', 2)
        .select(
          'user_id',
          'full_name',
          'email',
          'phone',
          'is_active',
          'last_login',
          'created_at'
        );

      if (search) {
        query = query.where((builder) => {
          builder
            .where('full_name', 'like', `%${search}%`)
            .orWhere('email', 'like', `%${search}%`)
            .orWhere('phone', 'like', `%${search}%`);
        });
      }

      const countRes = await query.clone().clearSelect().count('user_id as total').first();
      const total = Number(countRes?.total || 0);

      const owners = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);

      // Enrich owners with their hostels & stats
      const enrichedOwners = await Promise.all(
        owners.map(async (owner) => {
          const hostels = await db('hostel_master')
            .where('owner_id', owner.user_id)
            .select('hostel_id', 'hostel_name', 'city', 'is_active');

          const hostelIds = hostels.map((h) => h.hostel_id);

          let studentCount = 0;
          let roomCount = 0;
          let bedCount = 0;

          if (hostelIds.length > 0) {
            const studentRes = await db('students')
              .whereIn('hostel_id', hostelIds)
              .andWhere('status', 1)
              .count('student_id as count')
              .first();
            studentCount = Number(studentRes?.count || 0);

            const roomStats: any = await db('rooms')
              .whereIn('hostel_id', hostelIds)
              .select(
                db.raw('COUNT(room_id) as total_rooms'),
                db.raw('COALESCE(SUM(capacity), 0) as total_beds')
              )
              .first();
            roomCount = Number(roomStats?.total_rooms || 0);
            bedCount = Number(roomStats?.total_beds || 0);
          }

          return {
            ...owner,
            hostels,
            total_hostels: hostels.length,
            total_students: studentCount,
            total_rooms: roomCount,
            total_beds: bedCount,
          };
        })
      );

      return res.json({
        success: true,
        data: {
          owners: enrichedOwners,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
          },
        },
      });
    } catch (error: any) {
      console.error('getOwners error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * Get Single Owner Detailed Profile
   */
  async getOwnerDetails(req: DeveloperAuthRequest, res: Response) {
    try {
      const ownerId = parseInt(req.params.id, 10);
      const owner = await db('users').where({ user_id: ownerId, role_id: 2 }).first();

      if (!owner) {
        return res.status(404).json({ success: false, error: 'Owner not found' });
      }

      // Hostels owned
      const hostels = await db('hostel_master').where('owner_id', ownerId);
      const hostelIds = hostels.map((h) => h.hostel_id);

      let students: any[] = [];
      let payments: any[] = [];

      if (hostelIds.length > 0) {
        students = await db('students')
          .select('students.*', 'hostel_master.hostel_name')
          .leftJoin('hostel_master', 'students.hostel_id', 'hostel_master.hostel_id')
          .whereIn('students.hostel_id', hostelIds)
          .orderBy('students.created_at', 'desc')
          .limit(100);

        payments = await db('payments')
          .whereIn('hostel_id', hostelIds)
          .orderBy('created_at', 'desc')
          .limit(50);
      }

      await logDeveloperAction({
        developer_id: req.developer?.id,
        developer_username: req.developer?.username,
        action: 'DEVELOPER_VIEW_OWNER',
        target_type: 'OWNER',
        target_id: ownerId,
        metadata: { owner_name: owner.full_name, email: owner.email },
        req,
      });

      return res.json({
        success: true,
        data: {
          owner: {
            user_id: owner.user_id,
            full_name: owner.full_name,
            email: owner.email,
            phone: owner.phone,
            is_active: owner.is_active,
            last_login: owner.last_login,
            created_at: owner.created_at,
          },
          hostels,
          students,
          payments,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * Update Owner Status (Activate / Suspend)
   */
  async updateOwnerStatus(req: DeveloperAuthRequest, res: Response) {
    try {
      const ownerId = parseInt(req.params.id, 10);
      const { is_active, reason } = req.body;

      await db('users').where('user_id', ownerId).update({
        is_active: is_active ? 1 : 0,
        updated_at: new Date(),
      });

      await logDeveloperAction({
        developer_id: req.developer?.id,
        developer_username: req.developer?.username,
        action: is_active ? 'DEVELOPER_ACTIVATE_OWNER' : 'DEVELOPER_SUSPEND_OWNER',
        target_type: 'OWNER',
        target_id: ownerId,
        metadata: { is_active, reason },
        req,
      });

      return res.json({
        success: true,
        message: `Owner account has been ${is_active ? 'activated' : 'suspended'}.`,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── 5. STUDENT / TENANT MANAGEMENT ──────────────────────────────────────

  /**
   * Get Paginated Students across all Hostels
   */
  async getStudents(req: DeveloperAuthRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
      const offset = (page - 1) * limit;

      const search = (req.query.search as string || '').trim();
      const hostelId = req.query.hostel_id ? parseInt(req.query.hostel_id as string, 10) : undefined;
      const status = req.query.status as string; // '1' = Active, '0' = Vacated, '3' = Pending

      let query = db('students')
        .select(
          'students.student_id',
          'students.first_name',
          'students.last_name',
          'students.email',
          'students.phone',
          'students.gender',
          'students.status',
          'students.monthly_rent',
          'students.admission_date',
          'students.created_at',
          'hostel_master.hostel_id',
          'hostel_master.hostel_name',
          'rooms.room_id',
          'rooms.room_number',
          'users.full_name as owner_name'
        )
        .leftJoin('hostel_master', 'students.hostel_id', 'hostel_master.hostel_id')
        .leftJoin('rooms', 'students.room_id', 'rooms.room_id')
        .leftJoin('users', 'hostel_master.owner_id', 'users.user_id');

      if (search) {
        query = query.where((builder) => {
          builder
            .where('students.first_name', 'like', `%${search}%`)
            .orWhere('students.last_name', 'like', `%${search}%`)
            .orWhere('students.phone', 'like', `%${search}%`)
            .orWhere('students.email', 'like', `%${search}%`)
            .orWhere('rooms.room_number', 'like', `%${search}%`)
            .orWhere('hostel_master.hostel_name', 'like', `%${search}%`);
        });
      }

      if (hostelId) {
        query = query.where('students.hostel_id', hostelId);
      }

      if (status !== undefined && status !== 'ALL') {
        query = query.where('students.status', parseInt(status, 10));
      }

      const countRes = await query.clone().clearSelect().count('students.student_id as total').first();
      const total = Number(countRes?.total || 0);

      const students = await query.orderBy('students.created_at', 'desc').limit(limit).offset(offset);

      return res.json({
        success: true,
        data: {
          students,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
          },
        },
      });
    } catch (error: any) {
      console.error('getStudents error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * Get Single Student Full Details
   */
  async getStudentDetails(req: DeveloperAuthRequest, res: Response) {
    try {
      const studentId = parseInt(req.params.id, 10);
      const student = await db('students')
        .select(
          'students.*',
          'hostel_master.hostel_name',
          'hostel_master.address as hostel_address',
          'rooms.room_number',
          'rooms.floor',
          'users.full_name as owner_name',
          'users.phone as owner_phone'
        )
        .leftJoin('hostel_master', 'students.hostel_id', 'hostel_master.hostel_id')
        .leftJoin('rooms', 'students.room_id', 'rooms.room_id')
        .leftJoin('users', 'hostel_master.owner_id', 'users.user_id')
        .where('students.student_id', studentId)
        .first();

      if (!student) {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }

      // Payments
      const payments = await db('payments')
        .where('student_id', studentId)
        .orderBy('created_at', 'desc');

      // Monthly fees
      let monthlyFees: any[] = [];
      try {
        monthlyFees = await db('student_monthly_fees')
          .where('student_id', studentId)
          .orderBy('month_year', 'desc');
      } catch {}

      // Complaints
      let complaints: any[] = [];
      try {
        complaints = await db('complaints')
          .where('student_id', studentId)
          .orderBy('created_at', 'desc');
      } catch {}

      await logDeveloperAction({
        developer_id: req.developer?.id,
        developer_username: req.developer?.username,
        action: 'DEVELOPER_VIEW_STUDENT',
        target_type: 'STUDENT',
        target_id: studentId,
        hostel_id: student.hostel_id,
        metadata: { student_name: `${student.first_name} ${student.last_name || ''}`, phone: student.phone },
        req,
      });

      return res.json({
        success: true,
        data: {
          student,
          payments,
          monthly_fees: monthlyFees,
          complaints,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── 6. ROOMS & BEDS BREAKDOWN ───────────────────────────────────────────

  async getRoomsAndBeds(req: DeveloperAuthRequest, res: Response) {
    try {
      const hostelId = req.query.hostel_id ? parseInt(req.query.hostel_id as string, 10) : undefined;

      let query = db('rooms')
        .select(
          'rooms.*',
          'hostel_master.hostel_name',
          'hostel_master.city'
        )
        .leftJoin('hostel_master', 'rooms.hostel_id', 'hostel_master.hostel_id');

      if (hostelId) {
        query = query.where('rooms.hostel_id', hostelId);
      }

      const rooms = await query.orderBy('rooms.created_at', 'desc').limit(200);

      const totalRooms = rooms.length;
      const totalCapacity = rooms.reduce((a, b) => a + (b.capacity || 0), 0);
      const totalOccupied = rooms.reduce((a, b) => a + (b.occupied_beds || 0), 0);

      return res.json({
        success: true,
        data: {
          summary: {
            total_rooms: totalRooms,
            total_beds: totalCapacity,
            occupied_beds: totalOccupied,
            available_beds: Math.max(0, totalCapacity - totalOccupied),
            occupancy_rate: totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
          },
          rooms,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── 7. PAYMENTS MONITORING ──────────────────────────────────────────────

  async getPayments(req: DeveloperAuthRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
      const offset = (page - 1) * limit;

      const hostelId = req.query.hostel_id ? parseInt(req.query.hostel_id as string, 10) : undefined;
      const paymentMethod = req.query.payment_method as string;

      let query = db('fee_payments')
        .select(
          'fee_payments.*',
          'fee_payments.payment_date as paid_at',
          'hostel_master.hostel_name',
          'students.first_name',
          'students.last_name',
          'students.phone'
        )
        .leftJoin('hostel_master', 'fee_payments.hostel_id', 'hostel_master.hostel_id')
        .leftJoin('students', 'fee_payments.student_id', 'students.student_id');

      if (hostelId) {
        query = query.where('fee_payments.hostel_id', hostelId);
      }

      const countRes = await query.clone().clearSelect().count('fee_payments.payment_id as total').first();
      const total = Number(countRes?.total || 0);

      const payments = await query.orderBy('fee_payments.created_at', 'desc').limit(limit).offset(offset);

      const totalSumRes = await db('fee_payments').sum('amount as total').first();

      return res.json({
        success: true,
        data: payments.map((p: any) => ({
          ...p,
          student_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Student',
          payment_mode: p.transaction_type || 'ONLINE',
        })),
        summary: {
          total_collected: Number(totalSumRes?.total || 0),
          total_collected_last_30_days: Number(totalSumRes?.total || 0),
        },
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── 8. GLOBAL UNIFIED SEARCH ────────────────────────────────────────────

  async globalSearch(req: DeveloperAuthRequest, res: Response) {
    try {
      const q = (req.query.q as string || '').trim();
      if (!q || q.length < 2) {
        return res.json({
          success: true,
          data: {
            hostels: [],
            owners: [],
            students: [],
            rooms: [],
          },
        });
      }

      // Search Hostels
      const hostels = await db('hostel_master')
        .where('hostel_name', 'like', `%${q}%`)
        .orWhere('city', 'like', `%${q}%`)
        .orWhere('hostel_code', 'like', `%${q}%`)
        .select('hostel_id', 'hostel_name', 'city', 'state', 'hostel_code', 'is_active')
        .limit(10);

      // Search Owners
      const owners = await db('users')
        .where('role_id', 2)
        .andWhere((b) => {
          b.where('full_name', 'like', `%${q}%`)
            .orWhere('email', 'like', `%${q}%`)
            .orWhere('phone', 'like', `%${q}%`);
        })
        .select('user_id', 'full_name', 'email', 'phone', 'is_active')
        .limit(10);

      // Search Students
      const students = await db('students')
        .select('students.student_id', 'students.first_name', 'students.last_name', 'students.phone', 'students.status', 'hostel_master.hostel_name')
        .leftJoin('hostel_master', 'students.hostel_id', 'hostel_master.hostel_id')
        .where('students.first_name', 'like', `%${q}%`)
        .orWhere('students.last_name', 'like', `%${q}%`)
        .orWhere('students.phone', 'like', `%${q}%`)
        .orWhere('students.email', 'like', `%${q}%`)
        .limit(10);

      // Search Rooms
      const rooms = await db('rooms')
        .select('rooms.room_id', 'rooms.room_number', 'rooms.capacity', 'rooms.occupied_beds', 'hostel_master.hostel_name')
        .leftJoin('hostel_master', 'rooms.hostel_id', 'hostel_master.hostel_id')
        .where('rooms.room_number', 'like', `%${q}%`)
        .limit(10);

      return res.json({
        success: true,
        data: {
          hostels,
          owners,
          students,
          rooms,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── 9. SUPPORT & IMPERSONATION SESSIONS ─────────────────────────────────

  /**
   * Create Delegated Support Session for Owner or Tenant
   * Generates a temporary delegated JWT for troubleshooting without user's password.
   */
  async createSupportSession(req: DeveloperAuthRequest, res: Response) {
    try {
      const dev = req.developer!;
      const { target_user_id, target_role, hostel_id, reason, permission_level = 'FULL_SUPPORT' } = req.body;

      if (!target_user_id || !target_role) {
        return res.status(400).json({
          success: false,
          error: 'target_user_id and target_role (OWNER | TENANT) are required',
        });
      }

      let targetUserPayload: any = null;
      let hostelName = '';

      if (target_role === 'OWNER') {
        const owner = await db('users')
          .where({ user_id: target_user_id })
          .first();

        if (!owner) {
          return res.status(404).json({ success: false, error: 'Target owner account not found' });
        }

        // Find primary or requested hostel
        let resolvedHostelId = hostel_id || owner.hostel_id;
        if (!resolvedHostelId) {
          const firstHostel = await db('hostel_master').where({ owner_id: owner.user_id }).first();
          resolvedHostelId = firstHostel?.hostel_id;
        }

        if (resolvedHostelId) {
          const h = await db('hostel_master').where('hostel_id', resolvedHostelId).first('hostel_name');
          hostelName = h?.hostel_name || '';
        }

        targetUserPayload = {
          user_id: owner.user_id,
          email: owner.email,
          role_id: owner.role_id || 2,
          role: 'OWNER',
          full_name: owner.full_name,
          phone: owner.phone,
          hostel_id: resolvedHostelId,
          hostel_name: hostelName,
        };
      } else if (target_role === 'TENANT') {
        const student = await db('students')
          .select('students.*', 'hostel_master.hostel_name')
          .leftJoin('hostel_master', 'students.hostel_id', 'hostel_master.hostel_id')
          .where('students.student_id', target_user_id)
          .first();

        if (!student) {
          return res.status(404).json({ success: false, error: 'Target student account not found' });
        }

        hostelName = student.hostel_name || '';

        targetUserPayload = {
          user_id: student.student_id,
          student_id: student.student_id,
          id: student.student_id,
          email: student.email || `${student.phone}@hostix.tenant`,
          role_id: 3,
          role: 'TENANT',
          full_name: `${student.first_name} ${student.last_name || ''}`.trim(),
          name: `${student.first_name} ${student.last_name || ''}`.trim(),
          phone: student.phone,
          hostel_id: student.hostel_id,
          hostel_name: hostelName,
          room_id: student.room_id,
          is_allocated: !!student.room_id,
        };
      } else {
        return res.status(400).json({ success: false, error: 'Invalid target role. Must be OWNER or TENANT.' });
      }

      // Session expires in 30 minutes
      const durationMinutes = 30;
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      // Generate delegated JWT token
      const delegatedToken = generateToken({
        user_id: targetUserPayload.user_id,
        email: targetUserPayload.email,
        role_id: targetUserPayload.role_id,
        hostel_id: targetUserPayload.hostel_id,
      });

      // Insert record into support_sessions
      const [sessionId] = await db('support_sessions').insert({
        developer_id: dev.id,
        target_user_id,
        target_role,
        hostel_id: targetUserPayload.hostel_id || null,
        session_token: delegatedToken.slice(0, 500),
        permission_level,
        reason: reason || 'Troubleshooting user issue',
        expires_at: expiresAt,
        is_active: 1,
        created_at: new Date(),
      });

      // Log privileged audit event
      await logDeveloperAction({
        developer_id: dev.id,
        developer_username: dev.username,
        action: 'DEVELOPER_START_SUPPORT_SESSION',
        target_type: target_role,
        target_id: target_user_id,
        hostel_id: targetUserPayload.hostel_id,
        metadata: {
          support_session_id: sessionId,
          target_user: targetUserPayload.full_name,
          reason,
          expires_at: expiresAt,
        },
        req,
      });

      return res.json({
        success: true,
        message: `Support session created for ${targetUserPayload.full_name} (${target_role})`,
        data: {
          support_session_id: sessionId,
          token: delegatedToken,
          expires_at: expiresAt,
          target_user: targetUserPayload,
          target_role,
          hostel_name: hostelName,
          permission_level,
        },
      });
    } catch (error: any) {
      console.error('createSupportSession error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create support session: ' + error.message,
      });
    }
  },

  /**
   * Exit and Terminate Support Session
   */
  async exitSupportSession(req: DeveloperAuthRequest, res: Response) {
    try {
      const { session_id } = req.body;
      const dev = req.developer;

      if (session_id) {
        await db('support_sessions')
          .where('id', session_id)
          .update({
            is_active: 0,
            ended_at: new Date(),
          });
      }

      await logDeveloperAction({
        developer_id: dev?.id,
        developer_username: dev?.username,
        action: 'DEVELOPER_EXIT_SUPPORT_SESSION',
        target_type: 'SUPPORT_SESSION',
        target_id: session_id,
        metadata: { session_id, ended_at: new Date() },
        req,
      });

      return res.json({
        success: true,
        message: 'Support session terminated successfully',
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * Get Active Support Sessions
   */
  async getActiveSupportSessions(req: DeveloperAuthRequest, res: Response) {
    try {
      const activeSessions = await db('support_sessions')
        .where('is_active', 1)
        .andWhere('expires_at', '>', new Date())
        .orderBy('created_at', 'desc');

      return res.json({
        success: true,
        data: activeSessions,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── 10. AUDIT LOGS ──────────────────────────────────────────────────────

  async getAuditLogs(req: DeveloperAuthRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '30', 10)));
      const offset = (page - 1) * limit;

      const action = req.query.action as string;
      const targetType = req.query.target_type as string;

      let query = db('developer_audit_logs');

      if (action) {
        query = query.where('action', action);
      }
      if (targetType) {
        query = query.where('target_type', targetType);
      }

      const countRes = await query.clone().count('id as total').first();
      const total = Number(countRes?.total || 0);

      const logs = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);

      return res.json({
        success: true,
        data: {
          logs,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // ─── 11. SYSTEM STATUS & HEALTH ──────────────────────────────────────────

  async getSystemStatus(req: DeveloperAuthRequest, res: Response) {
    try {
      // Test DB ping latency
      const start = Date.now();
      await db.raw('SELECT 1');
      const dbLatencyMs = Date.now() - start;

      const memory = process.memoryUsage();
      const uptimeSec = process.uptime();

      return res.json({
        success: true,
        data: {
          server: {
            status: 'ONLINE',
            node_version: process.version,
            uptime_seconds: Math.floor(uptimeSec),
            environment: process.env.NODE_ENV || 'production',
            memory: {
              rss_mb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
              heap_used_mb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
              heap_total_mb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
            },
          },
          database: {
            status: 'HEALTHY',
            latency_ms: dbLatencyMs,
            pool_min: process.env.DB_POOL_MIN || '2',
            pool_max: process.env.DB_POOL_MAX || '10',
          },
          timestamp: new Date(),
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'System diagnostic failed: ' + error.message,
      });
    }
  },
};
