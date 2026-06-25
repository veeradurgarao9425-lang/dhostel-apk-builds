import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const createHostel = async (req: AuthRequest, res: Response) => {
  try {
    // Verify permissions: Main Admin (1) or Owner (2)
    if (req.user?.role_id !== 1 && req.user?.role_id !== 2) {
      return res.status(403).json({
        success: false,
        error: 'Access denied.'
      });
    }

    // Validate request body
    const {
      hostel_name,
      address,
      city,
      state,
      pincode,
      hostel_type,
      total_floors,
      rooms_per_floor,
      owner_id,
      amenities,
      admission_fee
    } = req.body;

    // Validation
    if (!hostel_name || hostel_name.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Hostel name must be at least 3 characters'
      });
    }

    // Determine the final owner: for owner (role 2), always use their own ID.
    // For admin (role 1), use the sent owner_id if provided, else default to admin's own user_id.
    const finalOwnerId = req.user?.role_id === 2
      ? req.user.user_id
      : (owner_id ? Number(owner_id) : req.user?.user_id);
    if (!finalOwnerId) {
      return res.status(400).json({
        success: false,
        error: 'Owner ID is required'
      });
    }

    // Verify owner exists
    const owner = await db('users')
      .where({ user_id: finalOwnerId, is_active: 1 })
      .whereIn('role_id', [1, 2])
      .first();

    if (!owner) {
      return res.status(404).json({
        success: false,
        error: 'Owner not found or inactive'
      });
    }

    // Enforce limit of 2 active hostels
    const ownerHostelsCount = await db('hostel_master')
      .where({ owner_id: finalOwnerId, is_active: 1 })
      .count('hostel_id as count')
      .first();

    if (ownerHostelsCount && Number(ownerHostelsCount.count) >= 2) {
      return res.status(400).json({
        success: false,
        error: 'Hostel limit reached. An owner can only manage a maximum of 2 active hostels.'
      });
    }

    // Check for duplicate hostel name
    const existing = await db('hostel_master')
      .where({ hostel_name, is_active: 1 })
      .first();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Hostel with this name already exists'
      });
    }

    // Prepare hostel data
    const hostelData: any = {
      hostel_name,
      address,
      city,
      state,
      pincode,
      hostel_type,
      owner_id: finalOwnerId,
      admission_fee: admission_fee || 0,
      is_active: 1,
      created_at: new Date()
    };

    // Add amenities if provided (store as JSON string)
    if (amenities && Array.isArray(amenities) && amenities.length > 0) {
      hostelData.amenities = JSON.stringify(amenities);
    }

    // Add total_floors if provided
    if (total_floors) {
      hostelData.total_floors = total_floors;
    }

    // Insert hostel
    const [hostel_id] = await db('hostel_master').insert(hostelData);

    // Always set this new hostel as the creator's active hostel.
    // This ensures the app reflects the new hostel immediately after creation.
    await db('users')
      .where({ user_id: req.user?.user_id })
      .update({ hostel_id });

    // If the owner is a different user than the creator, also update the owner's hostel_id
    // if they don't have one yet (don't override their existing active hostel).
    if (finalOwnerId !== req.user?.user_id) {
      const ownerUser = await db('users').where({ user_id: finalOwnerId }).first();
      if (ownerUser && !ownerUser.hostel_id) {
        await db('users')
          .where({ user_id: finalOwnerId })
          .update({ hostel_id });
      }
    }

    // Issue a fresh JWT so the frontend gets the updated hostel_id immediately
    const { generateToken } = await import('../utils/jwt.js');
    const newToken = generateToken({
      user_id: req.user?.user_id,
      email: req.user?.email,
      role_id: req.user?.role_id,
      hostel_id,
    });

    res.status(201).json({
      success: true,
      message: 'Hostel created successfully',
      data: {
        hostel_id,
        hostel_name,
        address,
        city,
        owner_id: finalOwnerId,
        token: newToken,
      }
    });
  } catch (error: any) {
    console.error('Create hostel error:', error);
    res.status(500).json({
      success: false,
      error: error?.sqlMessage || error?.message || 'Failed to create hostel'
    });
  }
};

// Get all hostels with owner information
export const getAllHostels = async (req: AuthRequest, res: Response) => {
  try {
    let query = db('hostel_master as h')
      .leftJoin('users as u', 'h.owner_id', 'u.user_id')
      .select(
        'h.hostel_id',
        'h.hostel_name',
        'h.address',
        'h.city',
        'h.state',
        'h.pincode',
        'h.hostel_type',
        'h.total_floors',
        'h.owner_id',
        'h.amenities',
        'h.admission_fee',
        'h.hostel_code',
        'u.full_name as owner_name',
        'u.phone as contact_number',
        'u.email as email',
        'h.created_at'
      )
      .where({ 'h.is_active': 1 });

    // Filter by my_hostels if requested from mobile apps, or if they are an owner
    if (req.query.my_hostels === 'true') {
      if (req.user?.role_id === 1 || req.user?.role_id === 2) {
        query = query.where({ 'h.owner_id': req.user.user_id });
      } else {
        query = query.where({ 'h.hostel_id': req.user?.hostel_id });
      }
    } else if (req.user?.role_id === 2) {
      query = query.where({ 'h.owner_id': req.user.user_id });
    }

    const hostels = await query.orderBy('h.created_at', 'desc');

    // Parse amenities for each hostel
    const hostelsWithParsedAmenities = hostels.map(hostel => {
      let amenitiesArray = [];

      if (hostel.amenities) {
        try {
          // Try to parse as JSON first
          amenitiesArray = JSON.parse(hostel.amenities);
        } catch (e) {
          // If not JSON, treat as comma-separated string
          amenitiesArray = hostel.amenities.split(',').map((a: string) => a.trim()).filter(Boolean);
        }
      }

      return {
        ...hostel,
        amenities: amenitiesArray
      };
    });

    res.json({
      success: true,
      data: hostelsWithParsedAmenities
    });
  } catch (error) {
    console.error('Get hostels error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hostels'
    });
  }
};

export const getHostelDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.params;

    const hostel = await db('hostel_master as h')
      .leftJoin('users as u', 'h.owner_id', 'u.user_id')
      .select(
        'h.*',
        'u.full_name as owner_name'
      )
      .where({ 'h.hostel_id': hostelId })
      .first();

    if (!hostel) {
      return res.status(404).json({
        success: false,
        error: 'Hostel not found'
      });
    }

    // Owners (role 2) may only view their own hostel
    if (req.user?.role_id === 2 && hostel.owner_id !== req.user.user_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    // Parse amenities
    let amenitiesArray = [];

    if (hostel.amenities) {
      try {
        // Try to parse as JSON first
        amenitiesArray = JSON.parse(hostel.amenities);
      } catch (e) {
        // If not JSON, treat as comma-separated string
        amenitiesArray = hostel.amenities.split(',').map((a: string) => a.trim()).filter(Boolean);
      }
    }

    const hostelWithParsedAmenities = {
      ...hostel,
      amenities: amenitiesArray
    };

    res.json({
      success: true,
      data: hostelWithParsedAmenities
    });
  } catch (error) {
    console.error('Get hostel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hostel details'
    });
  }
};

export const updateHostel = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.params;

    // Check if hostel exists
    const existingHostel = await db('hostel_master')
      .where({ hostel_id: hostelId })
      .first();

    if (!existingHostel) {
      return res.status(404).json({
        success: false,
        error: 'Hostel not found'
      });
    }

    // Verify permissions: Admin can edit any, Owner can edit only their own
    if (req.user?.role_id === 2 && existingHostel.owner_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only edit your own hostel.'
      });
    } else if (req.user?.role_id !== 1 && req.user?.role_id !== 2) {
      return res.status(403).json({
        success: false,
        error: 'Access denied.'
      });
    }
    const {
      hostel_name,
      address,
      city,
      state,
      pincode,
      hostel_type,
      total_floors,
      owner_id,
      amenities,
      admission_fee
    } = req.body;

    // Validate required fields
    const finalHostelName = hostel_name || existingHostel.hostel_name;
    const finalAddress = address !== undefined ? address : existingHostel.address;
    const finalCity = city !== undefined ? city : existingHostel.city;

    if (!finalHostelName || !finalAddress || !finalCity) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: hostel_name, address, city'
      });
    }

    // Determine owner_id: 
    // - For owners: use existing owner_id (they can't change it)
    // - For admins: require owner_id in request body
    let finalOwnerId: number;
    if (req.user?.role_id === 2) {
      // Owner editing their own hostel - use existing owner_id
      finalOwnerId = existingHostel.owner_id;
    } else if (req.user?.role_id === 1) {
      // Admin editing - require owner_id in request
      if (!owner_id) {
        return res.status(400).json({
          success: false,
          error: 'owner_id is required for admin updates'
        });
      }
      finalOwnerId = owner_id;
    } else {
      return res.status(403).json({
        success: false,
        error: 'Access denied.'
      });
    }

    // Check for duplicate hostel name (excluding current hostel)
    const duplicateName = await db('hostel_master')
      .where({ hostel_name: finalHostelName })
      .whereNot({ hostel_id: hostelId })
      .first();

    if (duplicateName) {
      return res.status(409).json({
        success: false,
        error: 'Hostel with this name already exists'
      });
    }

    // If owner_id is being changed (only for admin), verify new owner exists
    if (req.user?.role_id === 1 && finalOwnerId !== existingHostel.owner_id) {
      // Verify new owner exists and is a hostel owner
      const newOwner = await db('users')
        .where({ user_id: finalOwnerId, is_active: 1 })
        .whereIn('role_id', [1, 2])
        .first();

      if (!newOwner) {
        return res.status(404).json({
          success: false,
          error: 'New owner not found or inactive'
        });
      }

      // Update hostel_id for new owner
      await db('users')
        .where({ user_id: finalOwnerId })
        .update({ hostel_id: hostelId });

      // Clear hostel_id from old owner (if they have no other hostels)
      const oldOwnerHostelCount = await db('hostel_master')
        .where({ owner_id: existingHostel.owner_id, is_active: 1 })
        .whereNot({ hostel_id: hostelId })
        .count('hostel_id as count')
        .first();

      if (!oldOwnerHostelCount || Number(oldOwnerHostelCount.count) === 0) {
        await db('users')
          .where({ user_id: existingHostel.owner_id })
          .update({ hostel_id: null });
      }
    }

    // Prepare update data
    const updateData: any = {
      hostel_name: finalHostelName,
      address: finalAddress,
      city: finalCity,
      state: state !== undefined ? state : existingHostel.state,
      pincode: pincode !== undefined ? pincode : existingHostel.pincode,
      hostel_type: hostel_type !== undefined ? hostel_type : existingHostel.hostel_type,
      owner_id: finalOwnerId,
      updated_at: new Date()
    };

    // Add total_floors if provided
    if (total_floors !== undefined) {
      updateData.total_floors = total_floors;
    }

    // Add admission_fee if provided
    if (admission_fee !== undefined) {
      updateData.admission_fee = admission_fee;
    }

    // Add amenities if provided (store as JSON string)
    if (amenities !== undefined) {
      updateData.amenities = JSON.stringify(amenities);
    }

    // Update hostel
    await db('hostel_master')
      .where({ hostel_id: hostelId })
      .update(updateData);

    // Fetch updated hostel data
    const updatedHostel = await db('hostel_master')
      .where({ hostel_id: hostelId })
      .first();

    res.json({
      success: true,
      message: 'Hostel updated successfully',
      data: updatedHostel
    });
  } catch (error: any) {
    console.error('Update hostel error:', error);
    res.status(500).json({
      success: false,
      error: error?.sqlMessage || error?.message || 'Failed to update hostel'
    });
  }
};

export const deleteHostel = async (req: AuthRequest, res: Response) => {
  try {
    // Verify Main Admin (role_id = 1)
    if (req.user?.role_id !== 1) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Main Admin only.'
      });
    }

    const { hostelId } = req.params;

    // Check if hostel exists
    const hostel = await db('hostel_master')
      .where({ hostel_id: hostelId })
      .first();

    if (!hostel) {
      return res.status(404).json({
        success: false,
        error: 'Hostel not found'
      });
    }

    // Soft delete - set is_active to 0
    await db('hostel_master')
      .where({ hostel_id: hostelId })
      .update({
        is_active: 0,
        updated_at: new Date()
      });

    // Clear hostel_id from owner if they have no other active hostels
    const ownerHostelCount = await db('hostel_master')
      .where({ owner_id: hostel.owner_id, is_active: 1 })
      .count('hostel_id as count')
      .first();

    if (!ownerHostelCount || Number(ownerHostelCount.count) === 0) {
      await db('users')
        .where({ user_id: hostel.owner_id })
        .update({ hostel_id: null });
    }

    res.json({
      success: true,
      message: 'Hostel deleted successfully'
    });
  } catch (error) {
    console.error('Delete hostel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete hostel'
    });
  }
};
