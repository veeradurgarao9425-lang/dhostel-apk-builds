import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import db from '../config/database.js';
import { sendNotificationToHostelOwner, sendNotificationToStudent } from '../utils/notification.js';

// =======================
// LEAVE REQUESTS
// =======================

export const createLeaveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { hostel_id, start_date, end_date, reason } = req.body;
    const student_id = req.user?.user_id; 

    if (!hostel_id || !student_id || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const [leave_id] = await db('leave_requests').insert({
      hostel_id,
      student_id,
      start_date,
      end_date,
      reason: reason || null,
      status: 'Pending'
    });

    const student = await db('students').where('student_id', student_id).first();
    const studentName = student ? `${student.first_name} ${student.last_name || ''}`.trim() : 'A student';

    await sendNotificationToHostelOwner(
      hostel_id,
      'Leave',
      'New Leave Request',
      `${studentName} has requested leave from ${start_date} to ${end_date}.`,
      'Medium',
      { leave_id }
    );

    res.status(201).json({ success: true, message: 'Leave request submitted', leave_id });
  } catch (error: any) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getTenantLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const student_id = req.user?.user_id;
    if (!student_id) return res.status(400).json({ success: false, message: 'Missing student ID' });

    const leaves = await db('leave_requests')
      .where('student_id', student_id)
      .orderBy('created_at', 'desc');

    res.status(200).json({ success: true, leaves });
  } catch (error: any) {
    console.error('Error fetching tenant leaves:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getHostelLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.params;
    const leaves = await db('leave_requests')
      .join('students', 'leave_requests.student_id', '=', 'students.student_id')
      .where('leave_requests.hostel_id', hostelId)
      .select('leave_requests.*', 'students.first_name', 'students.last_name', 'students.phone')
      .orderBy('leave_requests.created_at', 'desc');

    res.status(200).json({ success: true, leaves });
  } catch (error: any) {
    console.error('Error fetching hostel leaves:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateLeaveStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { leaveId } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const leave = await db('leave_requests').where('leave_id', leaveId).first();
    if (!leave) return res.status(404).json({ success: false, message: 'Not found' });

    await db('leave_requests').where('leave_id', leaveId).update({ status });

    await sendNotificationToStudent(
      leave.student_id,
      'Leave',
      'Leave Request Update',
      `Your leave request has been ${status}.`,
      'Medium',
      { leave_id: leave.leave_id }
    );

    res.status(200).json({ success: true, message: 'Leave status updated' });
  } catch (error: any) {
    console.error('Error updating leave status:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// =======================
// VISITOR REQUESTS
// =======================

export const createVisitorRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { hostel_id, visitor_name, relation, visit_date, visit_time } = req.body;
    const student_id = req.user?.user_id;

    if (!hostel_id || !student_id || !visitor_name || !visit_date || !visit_time) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const [visitor_id] = await db('visitor_requests').insert({
      hostel_id,
      student_id,
      visitor_name,
      relation: relation || null,
      visit_date,
      visit_time,
      status: 'Pending'
    });

    const student = await db('students').where('student_id', student_id).first();
    const studentName = student ? `${student.first_name} ${student.last_name || ''}`.trim() : 'A student';

    await sendNotificationToHostelOwner(
      hostel_id,
      'Visitor',
      'New Visitor Request',
      `${studentName} requested a visitor pass for ${visitor_name} on ${visit_date}.`,
      'Medium',
      { visitor_id }
    );

    res.status(201).json({ success: true, message: 'Visitor request submitted', visitor_id });
  } catch (error: any) {
    console.error('Error creating visitor request:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getTenantVisitors = async (req: AuthRequest, res: Response) => {
  try {
    const student_id = req.user?.user_id;
    if (!student_id) return res.status(400).json({ success: false, message: 'Missing student ID' });

    const visitors = await db('visitor_requests')
      .where('student_id', student_id)
      .orderBy('created_at', 'desc');

    res.status(200).json({ success: true, visitors });
  } catch (error: any) {
    console.error('Error fetching tenant visitors:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getHostelVisitors = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.params;
    const visitors = await db('visitor_requests')
      .join('students', 'visitor_requests.student_id', '=', 'students.student_id')
      .where('visitor_requests.hostel_id', hostelId)
      .select('visitor_requests.*', 'students.first_name', 'students.last_name', 'students.phone')
      .orderBy('visitor_requests.created_at', 'desc');

    res.status(200).json({ success: true, visitors });
  } catch (error: any) {
    console.error('Error fetching hostel visitors:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateVisitorStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { visitorId } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const visitor = await db('visitor_requests').where('visitor_id', visitorId).first();
    if (!visitor) return res.status(404).json({ success: false, message: 'Not found' });

    await db('visitor_requests').where('visitor_id', visitorId).update({ status });

    await sendNotificationToStudent(
      visitor.student_id,
      'Visitor',
      'Visitor Request Update',
      `Your visitor request for ${visitor.visitor_name} has been ${status}.`,
      'Medium',
      { visitor_id: visitor.visitor_id }
    );

    res.status(200).json({ success: true, message: 'Visitor status updated' });
  } catch (error: any) {
    console.error('Error updating visitor status:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
