import express, { Response } from 'express';
import { authMiddleware, isOwnerOrAdmin, AuthRequest, verifyHostelAccess } from '../middleware/auth.js';
import db from '../config/database.js';
import { metaWhatsAppService, WhatsAppSendResult } from '../services/metaWhatsappService.js';

const router = express.Router();

// Apply authentication middleware and owner/admin restriction to all WhatsApp routes
router.use(authMiddleware, isOwnerOrAdmin);

/**
 * POST /api/whatsapp/send
 * Bulk / Individual WhatsApp Message Sender via Official Meta Cloud API
 */
router.post('/send', async (req: AuthRequest, res: Response) => {
  try {
    const { student_ids, template_name, parameters = {} } = req.body;
    const targetHostelId = req.body.hostel_id || req.user?.hostel_id;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please select at least one student (student_ids array required)'
      });
    }

    if (targetHostelId) {
      const hasAccess = await verifyHostelAccess(req.user, targetHostelId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You do not have permission for this hostel.'
        });
      }
    }

    const templateName = template_name || 'fee_reminder';

    // Fetch details of selected students from database strictly filtered by authorized hostel
    let studentQuery = db('students as s')
      .leftJoin('rooms as r', 's.room_id', '=', 'r.room_id')
      .leftJoin('hostel_master as h', 's.hostel_id', '=', 'h.hostel_id')
      .leftJoin('monthly_fees as mf', function () {
        this.on('s.student_id', '=', 'mf.student_id').andOn('mf.balance', '>', db.raw('0'));
      })
      .whereIn('s.student_id', student_ids);

    if (req.user?.role_id !== 1 && targetHostelId) {
      studentQuery = studentQuery.where('s.hostel_id', targetHostelId);
    }

    const students = await studentQuery
      .select(
        's.student_id',
        's.first_name',
        's.last_name',
        's.phone',
        'r.room_number',
        'h.hostel_name',
        db.raw('COALESCE(SUM(mf.balance), 0) as total_due')
      )
      .groupBy('s.student_id', 's.first_name', 's.last_name', 's.phone', 'r.room_number', 'h.hostel_name');

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No valid student records found for the selected IDs.'
      });
    }

    const results: WhatsAppSendResult[] = [];

    // Process students sequentially / in parallel
    for (const student of students) {
      const fullName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student';
      const phone = student.phone;

      if (!phone) {
        results.push({
          studentId: student.student_id,
          studentName: fullName,
          phoneNumber: 'N/A',
          status: 'FAILED',
          error: 'No mobile phone number registered for student.',
          sentAt: new Date().toISOString()
        });
        continue;
      }

      const dueAmount = Number(student.total_due || parameters.amount || 0).toLocaleString('en-IN');
      const dueDate = parameters.dueDate || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const hostelName = student.hostel_name || parameters.hostelName || 'Tenet Hostel';

      const result = await metaWhatsAppService.sendMessage({
        studentId: student.student_id,
        studentName: fullName,
        phoneNumber: phone,
        templateName,
        languageCode: parameters.languageCode || 'en_US',
        parameters: {
          studentName: fullName,
          amount: dueAmount,
          dueDate,
          hostelName,
          roomNumber: student.room_number || 'N/A',
          customMessage: parameters.customMessage
        }
      });

      results.push(result);
    }

    const sentCount = results.filter(r => r.status === 'SENT').length;
    const failedCount = results.filter(r => r.status === 'FAILED').length;

    return res.json({
      success: true,
      message: `WhatsApp processing complete: ${sentCount} Sent, ${failedCount} Failed.`,
      sentCount,
      failedCount,
      totalCount: results.length,
      results
    });
  } catch (error: any) {
    console.error('Error in POST /api/whatsapp/send:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to send WhatsApp Cloud API messages.'
    });
  }
});

/**
 * GET /api/whatsapp/history
 * Fetch WhatsApp log history
 */
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    await metaWhatsAppService.ensureLogTableExists();
    const logs = await db('whatsapp_message_logs')
      .orderBy('sent_at', 'desc')
      .limit(100);

    return res.json({
      success: true,
      logs
    });
  } catch (error: any) {
    console.error('Error in GET /api/whatsapp/history:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch WhatsApp history logs.'
    });
  }
});

export default router;
