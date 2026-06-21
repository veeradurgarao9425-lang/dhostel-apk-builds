import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

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
      error: 'Failed to fetch staff'
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

    await db('staff').where('staff_id', staffId).update(updateData);

    res.json({
      success: true,
      message: 'Staff member updated successfully'
    });
  } catch (error: any) {
    console.error('Update staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update staff member'
    });
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
