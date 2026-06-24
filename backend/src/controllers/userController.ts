import { Request, Response } from 'express';
import db from '../config/database.js';
import { hashPassword } from '../utils/bcrypt.js';

export const getOwners = async (req: Request, res: Response) => {
  try {
    // role_id = 2 is for Hostel Owner (as per registerOwner in authController)
    const owners = await db('users')
      .select(
        'user_id',
        'full_name',
        'email',
        'phone'
      )
      .where({ role_id: 2, is_active: 1 })
      .orderBy('full_name', 'asc');

    res.json({
      success: true,
      data: owners
    });
  } catch (error) {
    console.error('Get owners error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch owners'
    });
  }
};

export const updateOwner = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const reqUser = (req as any).user;
    const targetUserId = userId && userId !== 'undefined' ? userId : reqUser?.user_id;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Check if owner exists
    const existingOwner = await db('users')
      .where({ user_id: targetUserId })
      .first();

    if (!existingOwner) {
      return res.status(404).json({
        success: false,
        error: 'Owner not found'
      });
    }

    const { full_name, email, phone, password } = req.body;

    const finalFullName = full_name || existingOwner.full_name;
    const finalEmail = email !== undefined ? email : existingOwner.email;
    const finalPhone = phone !== undefined ? phone : existingOwner.phone;

    // Validate required fields
    if (!finalFullName || !finalPhone) {
      return res.status(400).json({
        success: false,
        error: 'Full name and phone are required'
      });
    }

    // Validate email format if provided
    if (finalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate phone format (10 digits)
    if (finalPhone && !/^\d{10}$/.test(finalPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Phone number must be 10 digits'
      });
    }

    // Check for duplicate email (excluding current user) only if email is provided
    if (finalEmail) {
      const emailExists = await db('users')
        .where({ email: finalEmail })
        .whereNot({ user_id: targetUserId })
        .first();

      if (emailExists) {
        return res.status(409).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    // Prepare update data
    const updateData: any = {
      full_name: finalFullName,
      email: finalEmail || null,
      phone: finalPhone,
      updated_at: new Date()
    };

    // Only update password if provided
    if (password && password.length >= 6) {
      updateData.password_hash = await hashPassword(password);
    }

    // Update owner
    await db('users')
      .where({ user_id: targetUserId })
      .update(updateData);

    // Fetch updated owner data
    const updatedOwner = await db('users')
      .select('user_id', 'full_name', 'email', 'phone')
      .where({ user_id: targetUserId })
      .first();

    res.json({
      success: true,
      message: 'Owner updated successfully',
      data: updatedOwner
    });
  } catch (error) {
    console.error('Update owner error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update owner'
    });
  }
};

export const deleteOwner = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Check if owner exists
    const owner = await db('users')
      .where({ user_id: userId, role_id: 2 })
      .first();

    if (!owner) {
      return res.status(404).json({
        success: false,
        error: 'Owner not found'
      });
    }

    // Check if owner has any hostels
    const hostelsCount = await db('hostel_master')
      .where({ owner_id: userId, is_active: 1 })
      .count('hostel_id as count')
      .first();

    if (hostelsCount && Number(hostelsCount.count) > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete owner. They have active hostels assigned.'
      });
    }

    // Soft delete - set is_active to 0
    await db('users')
      .where({ user_id: userId })
      .update({
        is_active: 0,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: 'Owner deleted successfully'
    });
  } catch (error) {
    console.error('Delete owner error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete owner'
    });
  }
};
