import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import db from '../config/database.js';
import { sendNotificationToHostelOwner, sendNotificationToStudent } from '../utils/notification.js';

// =======================
// TENANT ENDPOINTS
// =======================

export const createComplaint = async (req: AuthRequest, res: Response) => {
  try {
    const { hostel_id, category, title, description } = req.body;
    const student_id = req.user?.user_id; // Assuming auth middleware sets req.user.user_id for tenant

    if (!hostel_id || !student_id || !category || !title) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const [complaint_id] = await db('complaints').insert({
      hostel_id,
      student_id,
      category,
      title,
      description: description || null,
      status: 'Open'
    });

    // Fetch student info for notification
    const student = await db('students').where('student_id', student_id).first();
    const studentName = student ? `${student.first_name} ${student.last_name || ''}`.trim() : 'A student';
    const bedInfo = student?.bed_id ? ` (Bed: ${student.bed_id})` : '';

    // Notify Owner
    try {
      await sendNotificationToHostelOwner(
        hostel_id,
        'Complaint',
        'New Maintenance Complaint',
        `${studentName}${bedInfo} raised a new complaint: ${title}`,
        'Medium',
        { complaint_id }
      );
    } catch (err) {
      console.error('Failed to notify owner about new complaint:', err);
    }

    res.status(201).json({ success: true, message: 'Complaint raised successfully', complaint_id });
  } catch (error: any) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getTenantComplaints = async (req: AuthRequest, res: Response) => {
  try {
    const student_id = req.user?.user_id;
    const { hostel_id } = req.query;

    if (!student_id) {
      return res.status(400).json({ success: false, message: 'Missing student ID' });
    }

    let query = db('complaints').where('student_id', student_id);
    if (hostel_id) {
      query = query.andWhere('hostel_id', hostel_id);
    }

    const complaints = await query.orderBy('created_at', 'desc');
    res.status(200).json({ success: true, complaints });
  } catch (error: any) {
    console.error('Error fetching tenant complaints:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// =======================
// OWNER ENDPOINTS
// =======================

export const getHostelComplaints = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.params;
    
    // Join with students table to get name and room/bed
    const complaints = await db('complaints')
      .join('students', 'complaints.student_id', '=', 'students.student_id')
      .leftJoin('rooms', 'students.room_id', '=', 'rooms.room_id')
      .where('complaints.hostel_id', hostelId)
      .select(
        'complaints.*',
        'students.first_name',
        'students.last_name',
        'students.phone',
        'students.bed_id',
        'rooms.room_number'
      )
      .orderBy('complaints.created_at', 'desc');

    res.status(200).json({ success: true, complaints });
  } catch (error: any) {
    console.error('Error fetching hostel complaints:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateComplaintStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { complaintId } = req.params;
    const { status } = req.body;

    if (!status || !['Open', 'In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const complaint = await db('complaints').where('complaint_id', complaintId).first();
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    await db('complaints').where('complaint_id', complaintId).update({ status });

    // Notify Tenant
    try {
      await sendNotificationToStudent(
        complaint.student_id,
        'Complaint',
        'Complaint Update',
        `Your complaint "${complaint.title}" is now ${status}.`,
        'Medium',
        { complaint_id: complaint.complaint_id }
      );
    } catch (err) {
      console.error('Failed to notify student about complaint update:', err);
    }

    res.status(200).json({ success: true, message: 'Complaint status updated' });
  } catch (error: any) {
    console.error('Error updating complaint status:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
