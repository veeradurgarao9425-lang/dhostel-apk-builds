import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendNotificationToHostelOwner } from '../utils/notification.js';
import { resolveScopedHostelId, resolveOwnerHostelId, canAccessHostel } from '../utils/scope.js';

// Shared helper: derive bed capacity from room_type_name / description
const getCapacityFromRoomTypeName = (roomTypeName: string, description: string | null): number => {
  if (roomTypeName) {
    const numMatch = roomTypeName.match(/^(\d+)$/);
    if (numMatch) return parseInt(numMatch[1]);

    const patterns: { [key: string]: number } = {
      'single': 1,
      'double': 2,
      'triple': 3,
      'four sharing': 4,
      'five sharing': 5,
      'six sharing': 6,
      'dormitory': 10,
    };
    const lowerName = roomTypeName.toLowerCase();
    for (const [pattern, cap] of Object.entries(patterns)) {
      if (lowerName.includes(pattern)) return cap;
    }
  }
  if (description) {
    const descMatch = description.match(/(\d+)\s*(person|bed)/i);
    if (descMatch) return parseInt(descMatch[1]);
  }
  return 0;
};

// Shared helper: resolve which hostel_id a create/update should target based on the caller's role
const resolveHostelId = (
  user: AuthRequest['user'],
  hostel_id?: number
): { hostelId: number } | { status: number; error: string } => {
  if (user?.role_id === 2) {
    if (!user.hostel_id) {
      return { status: 403, error: 'Your account is not linked to any hostel. Please contact administrator.' };
    }
    return { hostelId: user.hostel_id };
  } else if (user?.role_id === 1) {
    if (!hostel_id) {
      return { status: 400, error: 'Admin must specify hostel_id' };
    }
    return { hostelId: hostel_id };
  }
  return { status: 403, error: 'Unauthorized to create rooms' };
};

// Shared helper: validate a floor number against the hostel's total_floors
const validateFloorNumber = async (
  hostelId: number,
  floorNumber: any
): Promise<{ status: number; error: string } | null> => {
  if (floorNumber === undefined || floorNumber === null) return null;
  const hostel = await db('hostel_master').where('hostel_id', hostelId).first();
  const maxFloors = hostel?.total_floors || 1;
  const parsedFloor = parseInt(floorNumber, 10);

  if (!isNaN(parsedFloor) && parsedFloor > maxFloors) {
    return {
      status: 400,
      error: `You added ${maxFloors} floors during PG creation. You need to go and update the PG form to add rooms on floor ${parsedFloor}.`
    };
  }
  return null;
};

// Shared helper: validate required room fields + capacity for a single room payload
const validateRoomFields = (fields: {
  room_number?: any;
  room_type_id?: any;
  rent_per_bed?: any;
  capacity?: any;
}): { status: number; error: string } | null => {
  const { room_number, room_type_id, rent_per_bed, capacity } = fields;
  if (!room_number || !room_type_id || !rent_per_bed) {
    return { status: 400, error: 'Required fields: room_number, room_type_id, rent_per_bed' };
  }
  // If capacity is explicitly provided it must be a positive number (avoids 0-bed rooms
  // that can never be allocated).
  if (capacity !== undefined && capacity !== null && capacity !== '' &&
      (isNaN(parseInt(capacity)) || parseInt(capacity) < 1)) {
    return { status: 400, error: 'Room capacity must be at least 1.' };
  }
  return null;
};

// Get all rooms for a hostel (Owner can only see their own hostel rooms)
export const getRooms = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.query;
    const user = req.user;

    let query = db('rooms as r')
      .leftJoin('room_types as rt', 'r.room_type_id', 'rt.room_type_id')
      .leftJoin('hostel_master as h', 'r.hostel_id', 'h.hostel_id')
      .select(
        'r.*',
        'rt.room_type_name as room_type_name',
        'rt.description as room_type_description',
        'h.hostel_name'
      )
      .select(
        db.raw(`(
          SELECT COUNT(*)
          FROM students
          WHERE students.room_id = r.room_id AND students.status IN (1, 2)
        ) as occupied_count`),
        db.raw(`(
          SELECT GROUP_CONCAT(bed_number)
          FROM students
          WHERE students.room_id = r.room_id AND students.status IN (1, 2) AND bed_number IS NOT NULL
        ) as occupied_beds_list_raw`)
      );



    // Owner (role 2): validate BOTH user_id AND hostel_id together in DB.
    // Admin/Super Admin (role 1): scoped to ?hostelId if given, otherwise global.
    const { hostelId: scopedHostelId, error: hostelError } = await resolveOwnerHostelId(user, hostelId as string | undefined);
    if (hostelError) {
      return res.status(403).json({ success: false, error: hostelError });
    }
    if (scopedHostelId) {
      query = query.where('r.hostel_id', scopedHostelId);
    }

    const rooms = await query.orderBy('r.hostel_id').orderBy('r.room_number');


    // Parse amenities JSON or CSV and calculate available_beds
    const roomsWithParsedAmenities = rooms.map((room) => {
      let amenitiesArray = [];

      if (room.amenities) {
        try {
          // Try parsing as JSON first
          amenitiesArray = JSON.parse(room.amenities);
        } catch (e) {
          // Fallback to CSV parsing if JSON fails
          amenitiesArray = room.amenities.split(',').map((a: string) => a.trim()).filter(Boolean);
        }
      }

      const occupiedCount = room.occupied_count !== undefined && room.occupied_count !== null 
          ? parseInt(room.occupied_count as string) 
          : (room.occupied_beds || 0);

      // Get total capacity: Prioritize DB column, fall back to calculation
      const totalCapacity = (room.capacity && room.capacity > 0)
        ? room.capacity
        : (room.room_type_name
          ? getCapacityFromRoomTypeName(room.room_type_name, room.room_type_description || null)
          : (room.room_type_id || 0));

      // Calculate available beds: Total Capacity - Occupied
      const availableBeds = Math.max(0, totalCapacity - occupiedCount);
      
      const occupiedBedsList = room.occupied_beds_list_raw ? room.occupied_beds_list_raw.split(',') : [];

      // Clean up the temporary select properties we don't want returned directly
      const { occupied_count, occupied_beds_list_raw, room_type_description, ...restRoom } = room;

      return {
        ...restRoom,
        amenities: amenitiesArray,
        available_beds: availableBeds,
        occupied_beds: occupiedCount,
        occupied_beds_list: occupiedBedsList,
        capacity: totalCapacity, // For StudentsPage expectations
        total_capacity: totalCapacity // For RoomsPage expectations
      };
    });

    res.json({
      success: true,
      data: roomsWithParsedAmenities
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rooms'
    });
  }
};

// Get room by ID
export const getRoomById = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    console.log('[getRoomById] ID requested:', roomId);

    const room = await db('rooms as r')
      .leftJoin('room_types as rt', 'r.room_type_id', 'rt.room_type_id')
      .leftJoin('hostel_master as h', 'r.hostel_id', 'h.hostel_id')
      .select(
        'r.room_id',
        'r.hostel_id',
        'r.room_number',
        'r.room_type_id',
        'r.floor_number',
        'r.capacity',
        'r.occupied_beds',
        'r.rent_per_bed',
        'r.amenities',
        'r.is_available',
        'rt.room_type_name',
        'rt.description as room_type_description',
        'h.hostel_name'
      )
      .where('r.room_id', roomId)
      .first();

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    if (!canAccessHostel(req.user, room.hostel_id)) {
      return res.status(403).json({ success: false, error: 'You do not have access to this room.' });
    }

    // Parse amenities
    let amenitiesArray = [];
    if (room.amenities) {
      if (typeof room.amenities === 'string') {
        try {
          amenitiesArray = JSON.parse(room.amenities);
        } catch (e) {
          amenitiesArray = room.amenities.split(',').map((a: string) => a.trim()).filter(Boolean);
        }
      } else if (Array.isArray(room.amenities)) {
        amenitiesArray = room.amenities;
      }
    }

    // Get occupants
    console.log('[getRoomById] Fetching occupants for room:', roomId);
    const students = await db('students')
      .where('room_id', roomId)
      .whereIn('status', [1, 2])
      .select('student_id', 'first_name', 'last_name', 'phone', 'bed_number');

    const occupiedCount = students.length;

    // Capacity: use r.capacity first, fall back to room type name, then hardcode 2
    const rawCap = (room as any).capacity;
    let totalCapacity = 0;
    if (rawCap !== undefined && rawCap !== null) {
      const parsed = parseInt(String(rawCap));
      if (!isNaN(parsed) && parsed > 0) totalCapacity = parsed;
    }
    if (totalCapacity <= 0) {
      totalCapacity = getCapacityFromRoomTypeName(
        (room as any).room_type_name || '',
        (room as any).room_type_description || null
      );
    }
    if (totalCapacity <= 0) totalCapacity = 2; // final fallback

    const availableBeds = Math.max(0, totalCapacity - occupiedCount);

    const occupiedBedsList = students.map(s => s.bed_number).filter(Boolean);

    res.json({
      success: true,
      data: {
        ...room,
        amenities: amenitiesArray,
        available_beds: availableBeds,
        occupied_beds: occupiedCount,
        occupied_beds_list: occupiedBedsList,
        capacity: totalCapacity,
        total_capacity: totalCapacity,
        occupants: students
      }
    });
  } catch (error: any) {
    console.error('getRoomById Error:', error);
    console.error('Stack:', error?.stack);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: error?.message
    });
  }
};

// List every bed in a room (A, B, C...) with occupancy — used by QR bed-assignment signup
export const getRoomBeds = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;

    const room = await db('rooms')
      .where('room_id', roomId)
      .select('room_id', 'room_number', 'capacity', 'hostel_id')
      .first();

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    if (!canAccessHostel(req.user, room.hostel_id)) {
      return res.status(403).json({ success: false, error: 'You do not have access to this room.' });
    }

    const occupants = await db('students')
      .where('room_id', roomId)
      .whereIn('status', [1, 2])
      .select('student_id', 'bed_number');

    const occupantByBed = new Map(occupants.map(o => [o.bed_number, o.student_id]));
    const capacity = parseInt(String(room.capacity)) || 1;

    const beds = Array.from({ length: capacity }, (_, i) => {
      const bedLetter = String.fromCharCode(65 + i);
      const student_id = occupantByBed.get(bedLetter) ?? null;
      return {
        bed_id: `${roomId}_${bedLetter}`,
        bed_number: bedLetter,
        bed_name: `${room.room_number}${bedLetter}`,
        status: student_id ? 'occupied' : 'available',
        student_id
      };
    });

    res.json({ success: true, data: beds });
  } catch (error: any) {
    console.error('getRoomBeds Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch beds' });
  }
};

// Create new room
export const createRoom = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const {
      hostel_id,
      room_number,
      room_type_id,
      floor_number,
      capacity,
      occupied_beds,
      rent_per_bed,
      amenities
    } = req.body;

    // Determine the hostel_id to use
    const hostelResult = resolveHostelId(user, hostel_id);
    if ('error' in hostelResult) {
      return res.status(hostelResult.status).json({ success: false, error: hostelResult.error });
    }
    const finalHostelId = hostelResult.hostelId;

    // Validate required fields + capacity
    const fieldError = validateRoomFields({ room_number, room_type_id, rent_per_bed, capacity });
    if (fieldError) {
      return res.status(fieldError.status).json({ success: false, error: fieldError.error });
    }

    // Validate floor number against hostel's total floors
    const floorError = await validateFloorNumber(finalHostelId, floor_number);
    if (floorError) {
      return res.status(floorError.status).json({ success: false, error: floorError.error });
    }

    // Check for duplicate room number in same hostel
    const existing = await db('rooms')
      .where({ hostel_id: finalHostelId, room_number })
      .first();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Room number already exists in this hostel'
      });
    }

    const [room_id] = await db('rooms').insert({
      hostel_id: finalHostelId,
      room_number,
      room_type_id,
      floor_number,
      capacity: (capacity !== undefined && capacity !== null && !isNaN(parseInt(capacity))) ? parseInt(capacity) : 4,
      occupied_beds: (occupied_beds !== undefined && occupied_beds !== null && !isNaN(parseInt(occupied_beds))) ? parseInt(occupied_beds) : 0,
      rent_per_bed,
      amenities: amenities ? JSON.stringify(amenities) : null,
      is_available: 1,
      created_at: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: { room_id }
    });

    // Trigger push and in-app notification to owner
    sendNotificationToHostelOwner(
      finalHostelId,
      'System Alert',
      'Room Created',
      `Room ${room_number} has been created successfully.`,
      'Low',
      { id: room_id }
    ).catch(err => console.error('Failed to send room creation notification:', err));
  } catch (error: any) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      error: error?.sqlMessage || error?.message || 'Failed to create room'
    });
  }
};

// Update room
export const updateRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const user = req.user;
    const {
      room_number,
      room_type_id,
      floor_number,
      capacity,
      occupied_beds,
      rent_per_bed,
      is_available,
      amenities
    } = req.body;

    // First, get the room to check ownership
    const room = await db('rooms')
      .where({ room_id: roomId })
      .first();

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Only Owner is blocked from acting on a room outside their own hostel; Admin bypasses.
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel'
        });
      }

      if (room.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only update rooms from your own hostel'
        });
      }
    }

    // Validate floor number against hostel's total floors
    const floorError = await validateFloorNumber(room.hostel_id, floor_number);
    if (floorError) {
      return res.status(floorError.status).json({ success: false, error: floorError.error });
    }

    const updateData: any = {
      updated_at: new Date()
    };

    if (room_number) updateData.room_number = room_number;
    if (room_type_id) updateData.room_type_id = room_type_id;
    if (floor_number !== undefined) updateData.floor_number = floor_number;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (occupied_beds !== undefined) updateData.occupied_beds = occupied_beds;
    if (rent_per_bed) updateData.rent_per_bed = rent_per_bed;
    if (is_available !== undefined) updateData.is_available = is_available;
    if (amenities !== undefined) updateData.amenities = JSON.stringify(amenities);

    await db('rooms')
      .where({ room_id: roomId })
      .update(updateData);

    res.json({
      success: true,
      message: 'Room updated successfully'
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update room'
    });
  }
};

// Delete room (hard delete)
export const deleteRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const user = req.user;

    // First, get the room to check ownership
    const room = await db('rooms')
      .where({ room_id: roomId })
      .first();

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Only Owner is blocked from acting on a room outside their own hostel; Admin bypasses.
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel'
        });
      }

      if (room.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete rooms from your own hostel'
        });
      }
    }

    // Check if room has active students
    const students = await db('students')
      .where({ room_id: roomId, status: 1 })
      .count('* as count')
      .first();

    const count = students?.count ? Number(students.count) : 0;
    if (count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete. Students are currently assigned to this room.'
      });
    }

    // Hard delete - permanently remove the room from database
    await db('rooms')
      .where({ room_id: roomId })
      .delete();

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete room'
    });
  }
};

// Bulk-create rooms for one floor in a single transaction (used by the "Floor Template" setup flow)
export const bulkCreateRooms = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { hostel_id, floor_number, rooms } = req.body;

    const hostelResult = resolveHostelId(user, hostel_id);
    if ('error' in hostelResult) {
      return res.status(hostelResult.status).json({ success: false, error: hostelResult.error });
    }
    const finalHostelId = hostelResult.hostelId;

    if (!Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({ success: false, error: 'rooms must be a non-empty array' });
    }

    const floorError = await validateFloorNumber(finalHostelId, floor_number);
    if (floorError) {
      return res.status(floorError.status).json({ success: false, error: floorError.error });
    }

    // Validate every row's required fields/capacity before touching the DB
    const rowErrors: { index: number; error: string }[] = [];
    rooms.forEach((room: any, index: number) => {
      const err = validateRoomFields(room);
      if (err) rowErrors.push({ index, error: err.error });
    });
    if (rowErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Some rooms are invalid',
        details: rowErrors
      });
    }

    // Duplicate check: within this batch, and against rooms already saved for this hostel
    const incomingNumbers = rooms.map((r: any) => String(r.room_number));
    const seen = new Set<string>();
    const intraBatchDuplicates = new Set<string>();
    incomingNumbers.forEach((n: string) => {
      if (seen.has(n)) intraBatchDuplicates.add(n);
      seen.add(n);
    });
    if (intraBatchDuplicates.size > 0) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate room numbers in this batch',
        details: Array.from(intraBatchDuplicates)
      });
    }

    const existingRooms = await db('rooms')
      .where({ hostel_id: finalHostelId })
      .whereIn('room_number', incomingNumbers)
      .select('room_number');
    if (existingRooms.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Some room numbers already exist in this hostel',
        details: existingRooms.map(r => r.room_number)
      });
    }

    const insertRows = rooms.map((room: any) => ({
      hostel_id: finalHostelId,
      room_number: room.room_number,
      room_type_id: room.room_type_id,
      floor_number,
      capacity: (room.capacity !== undefined && room.capacity !== null && !isNaN(parseInt(room.capacity)))
        ? parseInt(room.capacity) : 4,
      occupied_beds: 0,
      rent_per_bed: room.rent_per_bed,
      amenities: room.amenities ? JSON.stringify(room.amenities) : null,
      is_available: 1,
      created_at: new Date()
    }));

    await db.transaction(async trx => {
      await trx('rooms').insert(insertRows);
    });

    res.status(201).json({
      success: true,
      message: `${insertRows.length} rooms created successfully`,
      data: { count: insertRows.length }
    });

    sendNotificationToHostelOwner(
      finalHostelId,
      'System Alert',
      'Rooms Created',
      `${insertRows.length} rooms created on Floor ${floor_number}.`,
      'Low',
      { count: insertRows.length }
    ).catch(err => console.error('Failed to send bulk room creation notification:', err));
  } catch (error: any) {
    console.error('Bulk create rooms error:', error);
    res.status(500).json({
      success: false,
      error: error?.sqlMessage || error?.message || 'Failed to create rooms'
    });
  }
};

// Get room types
export const getRoomTypes = async (_req: AuthRequest, res: Response) => {
  try {
    const roomTypes = await db('room_types')
      .select('room_type_id', 'room_type_name', 'description')
      .orderBy('room_type_id', 'asc');

    res.json({
      success: true,
      data: roomTypes
    });
  } catch (error) {
    console.error('Get room types error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room types'
    });
  }
};
