import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';
import crypto from 'crypto';

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
      admission_fee,
      default_refundable_deposit
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

    const now = new Date();
    const trialEndDate = new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000);

    let hostel_type_id = 1;
    if (hostel_type) {
      const typeStr = String(hostel_type).toLowerCase();
      if (typeStr.includes('girl')) {
        hostel_type_id = 2;
      } else if (typeStr.includes('boy')) {
        hostel_type_id = 1;
      } else {
        hostel_type_id = 4;
      }
    }

    // Prepare hostel data
    const hostelData: any = {
      hostel_name,
      hostel_code: crypto.randomBytes(3).toString('hex'),
      address,
      city,
      state,
      pincode,
      hostel_type_id,
      owner_id: finalOwnerId,
      admission_fee: admission_fee || 0,
      default_refundable_deposit: default_refundable_deposit || 0,
      is_active: 1,
      trial_start_date: now,
      trial_end_date: trialEndDate,
      subscription_status_id: 1,
      created_at: now
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

    // Set this new hostel as the creator's active hostel, but only when the creator
    // is an Owner (role 2) creating their own hostel. Admin/Super Admin (role 1) must
    // stay unscoped so they retain global access to every hostel, not just the last one created.
    let tokenHostelId = req.user?.hostel_id;
    if (req.user?.role_id === 2) {
      await db('users')
        .where({ user_id: req.user?.user_id })
        .update({ hostel_id });
      tokenHostelId = hostel_id;
    }

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

    // Issue a fresh JWT so the frontend gets the updated hostel_id immediately (Owner only)
    const { generateToken } = await import('../utils/jwt.js');
    const newToken = generateToken({
      user_id: req.user?.user_id,
      email: req.user?.email,
      role_id: req.user?.role_id,
      hostel_id: tokenHostelId,
    });

    const { getWelcomeEmailTemplate, getSuperAdminNewRegistrationTemplate } = await import('../utils/emailTemplates.js');

    try {
      // 1. Log Subscription History
      await db('subscription_history').insert({
        hostel_id,
        event_type: 'Trial Started',
        remarks: '40-day free trial assigned upon registration'
      });

      let ownerEmail = '';
      let ownerName = 'Hostel Owner';

      const ownerRec = await db('users').where({ user_id: finalOwnerId }).first();
      if (ownerRec && ownerRec.email) {
        ownerEmail = ownerRec.email;
        ownerName = ownerRec.full_name;
      }

      const formattedEndDate = trialEndDate.toLocaleDateString();

      // 2. Send Welcome Email to Owner
      if (ownerEmail) {
        await sendEmail({
          to: ownerEmail,
          subject: 'Welcome to Hostix - Trial Started!',
          html: getWelcomeEmailTemplate(ownerName, hostel_name, formattedEndDate),
          emailType: 'Welcome',
          hostelId: hostel_id
        });
      }

      // 3. Send Alert to Super Admin
      const superAdminInfo = {
        hostel_name,
        full_name: ownerName,
        email: ownerEmail,
        phone: ownerRec?.phone || 'N/A',
        trial_start_date: now.toLocaleDateString(),
        trial_end_date: formattedEndDate
      };

      await sendEmail({
        to: process.env.SUPER_ADMIN_EMAIL || 'hostixhelp@gmail.com',
        subject: 'New Hostel Registration Alert - Hostix',
        html: getSuperAdminNewRegistrationTemplate(superAdminInfo),
        emailType: 'Super Admin Alert',
        hostelId: hostel_id
      });

      // 4. Create in-app admin notification
      await db('notifications').insert({
        user_id: 1, // assuming user_id 1 is Super Admin
        hostel_id: hostel_id,
        notification_type: 'System Alert',
        title: 'New Hostel Registered',
        message: `${hostel_name} has just registered by ${ownerName}.`,
        priority: 'High'
      });

    } catch (err) {
      console.error('Failed to log history or send registration emails:', err);
    }

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
      .leftJoin('hostel_type_master as ht', 'h.hostel_type_id', 'ht.id')
      .select(
        'h.hostel_id',
        'h.hostel_name',
        'h.address',
        'h.city',
        'h.state',
        'h.pincode',
        'ht.name as hostel_type',
        'h.total_floors',
        'h.owner_id',
        'h.amenities',
        'h.admission_fee',
        'h.default_refundable_deposit',
        'h.hostel_code',
        'u.full_name as owner_name',
        'u.phone as contact_number',
        'u.email as email',
        'h.created_at'
      )
      .where({ 'h.is_active': 1 });

    // Security filter: If they are an owner or requested my_hostels, fetch hostels linked by owner_id or hostel_id
    const user = req.user;
    if (user?.role_id === 2 || req.query.my_hostels === 'true') {
      const validUserId = (user?.user_id && !isNaN(Number(user.user_id)) && Number(user.user_id) > 0) ? Number(user.user_id) : null;
      const validHostelId = (user?.hostel_id && !isNaN(Number(user.hostel_id)) && Number(user.hostel_id) > 0) ? Number(user.hostel_id) : null;

      if (validUserId || validHostelId) {
        query = query.where(function() {
          if (validUserId) {
            this.where('h.owner_id', validUserId);
          }
          if (validHostelId) {
            this.orWhere('h.hostel_id', validHostelId);
          }
        });
      } else {
        return res.json({ success: true, data: [] });
      }
    }

    const hostels = await query.orderBy('h.created_at', 'desc');

    // Parse amenities for each hostel
    const hostelsWithParsedAmenities = hostels.map(hostel => {
      let amenitiesArray = [];

      if (hostel.amenities) {
        try {
          // Try to parse as JSON first
          amenitiesArray = typeof hostel.amenities === 'string' ? JSON.parse(hostel.amenities) : hostel.amenities;
        } catch (e) {
          // If not JSON, treat as comma-separated string
          amenitiesArray = String(hostel.amenities).split(',').map((a: string) => a.trim()).filter(Boolean);
        }
      }

      return {
        ...hostel,
        amenities: Array.isArray(amenitiesArray) ? amenitiesArray : []
      };
    });

    res.json({
      success: true,
      data: hostelsWithParsedAmenities
    });
  } catch (error: any) {
    console.error('Get hostels error:', error?.message || error);
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
      .leftJoin('hostel_type_master as ht', 'h.hostel_type_id', 'ht.id')
      .leftJoin('subscription_status_master as ssm', 'h.subscription_status_id', 'ssm.id')
      .select(
        'h.*',
        'ht.name as hostel_type',
        'ssm.name as subscription_status',
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
      admission_fee,
      default_refundable_deposit
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
      owner_id: finalOwnerId,
      updated_at: new Date()
    };

    if (hostel_type !== undefined) {
      const typeStr = String(hostel_type).toLowerCase();
      let hostel_type_id = 1;
      if (typeStr.includes('girl')) {
        hostel_type_id = 2;
      } else if (typeStr.includes('boy')) {
        hostel_type_id = 1;
      } else {
        hostel_type_id = 4;
      }
      updateData.hostel_type_id = hostel_type_id;
    }

    // Add total_floors if provided
    if (total_floors !== undefined) {
      updateData.total_floors = total_floors;
    }

    // Add admission_fee if provided
    if (admission_fee !== undefined) {
      updateData.admission_fee = admission_fee;
    }

    // Add default_refundable_deposit if provided
    if (default_refundable_deposit !== undefined) {
      updateData.default_refundable_deposit = default_refundable_deposit;
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
