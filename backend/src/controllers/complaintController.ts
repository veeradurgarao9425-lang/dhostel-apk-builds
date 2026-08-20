import { Response } from 'express';
import { AuthRequest, verifyHostelAccess } from '../middleware/auth.js';
import db from '../config/database.js';
import { processFileUpload } from '../utils/fileUpload.js';
import { sendNotificationToHostelOwner, sendNotificationToStudent } from '../utils/notification.js';
import { io } from '../socket/index.js';
import { getAuthenticatedStudent, getAuthenticatedStudentId } from '../utils/scope.js';

// =======================
// TENANT ENDPOINTS
// =======================

export const createComplaint = async (req: AuthRequest, res: Response) => {
  try {
    const { category, title, description } = req.body;
    const student = await getAuthenticatedStudent(req.user);
    if (!student) {
      return res.status(401).json({ success: false, message: 'Tenant profile not found' });
    }
    const student_id = student.student_id;
    // Strict isolation: always bind directly to the authenticated tenant's hostel
    const hostel_id = student.hostel_id;

    if (!hostel_id || !category || !title) {
      return res.status(400).json({ success: false, message: 'Missing required fields or student is not assigned to a hostel.' });
    }

    const files = (req as any).files as Express.Multer.File[] | undefined;
    let image_urls: string | null = null;
    if (files && files.length > 0) {
      const uploadedUrls = await Promise.all(files.map(f => processFileUpload(f, 'complaints')));
      image_urls = JSON.stringify(uploadedUrls);
    }

    const [complaint_id] = await db('complaints').insert({
      hostel_id,
      student_id,
      category,
      title,
      description: description || null,
      image_urls,
      status: 'Open'
    });

    // Fetch student info for notification
    const studentDetails = await db('students').where('student_id', student_id).first();
    const studentName = studentDetails ? `${studentDetails.first_name} ${studentDetails.last_name || ''}`.trim() : 'A student';
    const bedInfo = studentDetails?.bed_id ? ` (Bed: ${studentDetails.bed_id})` : '';

    // Notify Owner via Push & Sockets
    try {
      if (io) {
        io.to(`hostel_${hostel_id}`).emit('new_complaint', {
          complaint_id, title, category, studentName, bedInfo, created_at: new Date()
        });
        io.to(`hostel_${hostel_id}`).emit('REFRESH_NOTIFICATIONS');
      }
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
    const student = await getAuthenticatedStudent(req.user);
    if (!student) {
      return res.status(401).json({ success: false, message: 'Tenant profile not found' });
    }
    const student_id = student.student_id;

    // Strict boundary: only return complaints for this specific student and their hostel
    const complaints = await db('complaints')
      .where('student_id', student_id)
      .andWhere('hostel_id', student.hostel_id)
      .orderBy('created_at', 'desc');

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
    const user = req.user;

    // Strict multi-hostel owner isolation
    const hasAccess = await verifyHostelAccess(user, hostelId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied. You do not own this hostel.' });
    }
    
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
    const user = req.user;

    if (!status || !['Open', 'In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const complaint = await db('complaints').where('complaint_id', complaintId).first();
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Strict multi-hostel owner isolation
    const hasAccess = await verifyHostelAccess(user, complaint.hostel_id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied. You do not have permission for this hostel.' });
    }

    await db('complaints').where('complaint_id', complaintId).update({ status });

    // Notify Tenant via Push & Sockets
    try {
      if (io) {
        io.to(`tenant_${complaint.student_id}`).emit('complaint_updated', {
          complaint_id: complaint.complaint_id, status
        });
        io.to(`tenant_${complaint.student_id}`).emit('REFRESH_NOTIFICATIONS');
      }
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
