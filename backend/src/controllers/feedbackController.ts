import { Request, Response } from 'express';
import db from '../config/database.js';
import { sendEmail } from '../utils/email.js';

let tableChecked = false;
async function ensureFeedbackTable() {
  if (tableChecked) return;
  try {
    const hasTable = await db.schema.hasTable('app_feedback');
    if (!hasTable) {
      await db.schema.createTable('app_feedback', (table) => {
        table.increments('feedback_id').primary();
        table.integer('user_id').nullable();
        table.integer('hostel_id').nullable();
        table.string('full_name', 255).nullable();
        table.string('email', 255).nullable();
        table.string('phone', 50).nullable();
        table.string('role', 50).nullable();
        table.integer('rating').nullable();
        table.string('issue_area', 100).nullable();
        table.string('category', 100).defaultTo('General Feedback');
        table.text('message').notNullable();
        table.json('images').nullable();
        table.string('app_version', 50).nullable();
        table.string('status', 50).defaultTo('NEW');
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('✅ app_feedback table verified/created');
    } else {
      const hasRating = await db.schema.hasColumn('app_feedback', 'rating');
      if (!hasRating) {
        await db.schema.alterTable('app_feedback', (table) => {
          table.integer('rating').nullable();
          table.string('issue_area', 100).nullable();
        });
      }
    }
    tableChecked = true;
  } catch (err) {
    console.warn('Notice ensuring app_feedback table:', err);
  }
}

export const submitFeedback = async (req: any, res: Response) => {
  try {
    await ensureFeedbackTable();

    const { rating, issue_area, category, message, app_version, contact_email, contact_phone, full_name } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your message or feedback.',
      });
    }

    const authUser = req.user || {};
    const userId = authUser.user_id || authUser.id || null;
    const hostelId = authUser.hostel_id || null;
    const userRole = authUser.role_name || authUser.role || (authUser.role_id === 2 ? 'OWNER' : (authUser.role_id === 3 ? 'TENANT' : 'USER'));
    const userEmail = contact_email || authUser.email || 'Anonymous';
    const userName = full_name || authUser.full_name || authUser.name || 'Hostix User';
    const userPhone = contact_phone || authUser.phone || null;

    // Collect uploaded file URLs
    const files = req.files as Express.Multer.File[] | undefined;
    const imagePaths = files && files.length > 0 ? files.map(f => `/uploads/${f.filename}`) : [];

    const numRating = rating ? parseInt(String(rating), 10) : 5;

    const [feedbackId] = await db('app_feedback').insert({
      user_id: userId,
      hostel_id: hostelId,
      full_name: userName,
      email: userEmail,
      phone: userPhone,
      role: userRole,
      rating: numRating,
      issue_area: issue_area || null,
      category: category || 'General Feedback',
      message: message.trim(),
      images: JSON.stringify(imagePaths),
      app_version: app_version || '1.0.4',
      status: 'NEW',
      created_at: new Date(),
    });

    // Send instant email notification to Super Admin / Support team (non-blocking)
    const superAdmin = process.env.SUPER_ADMIN_EMAIL || 'hostixhelp@gmail.com';
    const categoryBadge = category === 'Bug / Issue' ? '🐛 BUG REPORT' : (category === 'Feature Request' ? '💡 FEATURE REQUEST' : '💬 APP FEEDBACK');

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px; background-color: #FFFFFF;">
        <div style="background: linear-gradient(135deg, #7C3AED, #5F2EEA); padding: 18px 24px; border-radius: 12px; margin-bottom: 20px; color: #FFFFFF;">
          <h2 style="margin: 0; font-size: 20px;">${categoryBadge}</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Hostix Mobile App User Feedback</p>
        </div>

        <div style="margin-bottom: 16px;">
          <p style="margin: 4px 0; font-size: 14px; color: #64748B;"><strong>From:</strong> ${userName} (${userRole})</p>
          <p style="margin: 4px 0; font-size: 14px; color: #64748B;"><strong>Email:</strong> ${userEmail}</p>
          ${userPhone ? `<p style="margin: 4px 0; font-size: 14px; color: #64748B;"><strong>Phone:</strong> ${userPhone}</p>` : ''}
          ${hostelId ? `<p style="margin: 4px 0; font-size: 14px; color: #64748B;"><strong>Hostel ID:</strong> #${hostelId}</p>` : ''}
          <p style="margin: 4px 0; font-size: 14px; color: #64748B;"><strong>App Version:</strong> ${app_version || '1.0.4'}</p>
        </div>

        <div style="background-color: #F8FAFC; border-left: 4px solid #7C3AED; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: #1E293B; font-size: 15px;">User Message:</h4>
          <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message.trim()}</p>
        </div>

        ${imagePaths.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 8px 0; color: #1E293B; font-size: 14px;">Attached Screenshots (${imagePaths.length}):</h4>
            <p style="margin: 0; font-size: 13px; color: #2563EB;">Attachments uploaded to server uploads directory.</p>
          </div>
        ` : ''}

        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94A3B8; text-align: center; margin: 0;">Hostix Platform Support Team • Ticket #${feedbackId}</p>
      </div>
    `;

    sendEmail({
      to: superAdmin,
      subject: `[Hostix Feedback] ${categoryBadge}: From ${userName}`,
      html: emailHtml,
    }).catch((e: any) => console.warn('Feedback notification email notice:', e?.message || e));

    return res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! We will review it and fix any issues promptly.',
      data: {
        feedback_id: feedbackId,
      },
    });
  } catch (error: any) {
    console.error('Submit feedback error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit feedback. Please try again.',
    });
  }
};

export const sendFeedbackPrompt = async (req: any, res: Response) => {
  try {
    const authUser = req.user || {};
    const userId = req.body.user_id || authUser.user_id || authUser.id || null;
    const studentId = req.body.student_id || (authUser.role === 'TENANT' ? authUser.id : null);
    const hostelId = req.body.hostel_id || authUser.hostel_id || null;

    const { sendFeedbackRequestNotification } = await import('../utils/notification.js');
    await sendFeedbackRequestNotification({
      userId,
      studentId,
      hostelId,
    });

    return res.json({
      success: true,
      message: 'Feedback notification sent successfully.',
    });
  } catch (error: any) {
    console.error('Send feedback prompt error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send feedback notification.',
    });
  }
};

export const getFeedbacks = async (req: Request, res: Response) => {
  try {
    await ensureFeedbackTable();
    const feedbacks = await db('app_feedback').orderBy('created_at', 'desc').limit(100);
    return res.json({
      success: true,
      data: feedbacks,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
