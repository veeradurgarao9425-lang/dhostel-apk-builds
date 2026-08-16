import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  emailType?: string;
  hostelId?: number | null;
}

// ─── Create transporter lazily (reads env vars at call-time, not module-load) ──
const createTransporter = () => {
  const user = (process.env.EMAIL_USER || '').trim();
  // Gmail App Passwords are sometimes copied with spaces between groups — strip them
  const pass = (process.env.EMAIL_PASSWORD || '').replace(/\s/g, '');
  const service = process.env.EMAIL_SERVICE || 'gmail';

  if (!user || !pass) {
    throw new Error(
      `Email credentials missing. EMAIL_USER="${user || '(not set)'}" EMAIL_PASSWORD="${pass ? '(set)' : '(not set)'}"`
    );
  }

  console.log(`📮 Creating Gmail transporter for user: ${user}`);

  return nodemailer.createTransport({
    service,
    auth: { user, pass },
    // Fail fast (3-5s) instead of hanging when SMTP credentials or port 587/465 is blocked.
    // Prevents HTTP request timeouts / Network Errors in client app.
    connectionTimeout: 4000, // 4s to establish TCP connection
    greetingTimeout: 3000,   // 3s to receive greeting
    socketTimeout: 5000,     // 5s of socket inactivity
  });
};

// ─── Parse "Name <email>" or bare "email" into Brevo's sender shape ─────────────
const parseSender = (): { email: string; name: string } => {
  const raw = process.env.EMAIL_FROM || process.env.EMAIL_USER || '';
  const match = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim() || 'Hostix Hostel', email: match[2].trim() };
  return { name: 'Hostix Hostel', email: raw.trim() };
};

// ─── Send via Brevo HTTP API (port 443) — works on hosts that block SMTP ────────
const sendViaBrevo = async (options: EmailOptions): Promise<void> => {
  const sender = parseSender();
  console.log(`📨 Sending via Brevo HTTP API  |  from: ${sender.email}  to: ${options.to}`);

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY as string,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
      ...(options.attachments?.length && {
        attachment: options.attachments.map((a) => ({
          name: a.filename,
          content: Buffer.isBuffer(a.content)
            ? a.content.toString('base64')
            : Buffer.from(a.content).toString('base64'),
        })),
      }),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`❌ Brevo send FAILED (${res.status}):`, body);
    throw new Error(`Brevo API ${res.status}: ${body}`);
  }
  const data: any = await res.json().catch(() => ({}));
  console.log(`✅ Email sent via Brevo: ${data.messageId || '(no id)'}`);
};

// ─── Send via Resend HTTP API (port 443) — Instant zero-wait email delivery ──────
const sendViaResend = async (options: EmailOptions): Promise<void> => {
  const fromAddress = process.env.RESEND_FROM || 'Hostix <onboarding@resend.dev>';
  console.log(`📨 Sending via Resend HTTP API  |  from: ${fromAddress}  to: ${options.to}`);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      ...(options.attachments?.length && {
        attachments: options.attachments.map((a) => ({
          filename: a.filename,
          content: Buffer.isBuffer(a.content)
            ? a.content.toString('base64')
            : Buffer.from(a.content).toString('base64'),
        })),
      }),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`❌ Resend send FAILED (${res.status}):`, body);
    throw new Error(`Resend API ${res.status}: ${body}`);
  }
  const data: any = await res.json().catch(() => ({}));
  console.log(`✅ Email sent via Resend: ${data.id || '(no id)'}`);
};

// ─── Send via SendGrid HTTP API (port 443) — $0 cost, 0 domain needed ─────────────
const sendViaSendGrid = async (options: EmailOptions): Promise<void> => {
  const sender = parseSender();
  console.log(`📨 Sending via SendGrid HTTP API  |  from: ${sender.email}  to: ${options.to}`);

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: options.to }] }],
      from: { email: sender.email, name: sender.name },
      subject: options.subject,
      content: [{ type: 'text/html', value: options.html }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`❌ SendGrid send FAILED (${res.status}):`, body);
    throw new Error(`SendGrid API ${res.status}: ${body}`);
  }
  console.log(`✅ Email sent via SendGrid successfully`);
};

// ─── Send via SMTP (nodemailer) — local-dev fallback when no API key is set ──────
const sendViaSmtp = async (options: EmailOptions): Promise<void> => {
  const from = process.env.EMAIL_FROM || `"Hostix Hostel" <${process.env.EMAIL_USER}>`;

  console.log(`📧 Sending email via SMTP to: ${options.to}  |  Subject: ${options.subject}`);
  console.log(`   EMAIL_USER=${process.env.EMAIL_USER || '(not set)'}`);

  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  });
  console.log(`✅ Email sent successfully: ${info.messageId}`);
};

import db from '../config/database.js';

// ─── Core send function ────────────────────────────────────────────────────────
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  let deliveryStatus = 'Sent';
  let errorMessage = null;

  try {
    if (process.env.SENDGRID_API_KEY) {
      await sendViaSendGrid(options);
    } else if (process.env.RESEND_API_KEY) {
      await sendViaResend(options);
    } else if (process.env.BREVO_API_KEY) {
      await sendViaBrevo(options);
    } else if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      await sendViaSmtp(options);
    } else {
      await sendViaSmtp(options);
    }
  } catch (error: any) {
    deliveryStatus = 'Failed';
    errorMessage = error.message;
    console.error('❌ Send email FAILED:', error.message);
  } finally {
    // Attempt to log the email
    try {
      if (options.emailType) {
        await db('email_logs').insert({
          hostel_id: options.hostelId || null,
          recipient_email: options.to,
          email_type: options.emailType,
          subject: options.subject,
          delivery_status: deliveryStatus,
          error_message: errorMessage
        });
      }
    } catch (dbError) {
      console.error('❌ Failed to log email to database:', dbError);
    }
  }

  if (deliveryStatus === 'Failed') {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ Warning: Failed to send email in development: ${errorMessage}`);
    } else {
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }
};

// ─── Password reset email ──────────────────────────────────────────────────────
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  userName: string,
  otp?: string
): Promise<void> => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
        <p style="color: #666; line-height: 1.6;">Hello ${userName},</p>
        <p style="color: #666; line-height: 1.6;">
          We received a request to reset your password. Click the link below to create a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        ${otp ? `
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">Or use this 6-digit OTP code in the mobile app:</p>
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; margin: 10px auto; max-width: 200px; border: 1px dashed #cbd5e1;">
            <span style="font-size: 24px; font-weight: bold; color: #4f46e5; letter-spacing: 4px;">${otp}</span>
          </div>
        </div>
        ` : ''}

        <p style="color: #666; line-height: 1.6;">Or copy and paste this link in your browser:</p>
        <p style="background-color: #f0f0f0; padding: 10px; border-radius: 4px; word-break: break-all; color: #333;">
          ${resetLink}
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
        </p>
        <p style="color: #999; font-size: 12px;">Hostix System</p>
      </div>
    </div>
  `;

  // In development, log the link even if email fails
  if (process.env.NODE_ENV === 'development') {
    console.log('\n' + '='.repeat(80));
    console.log('🔐 PASSWORD RESET LINK (Development fallback)');
    console.log('='.repeat(80));
    console.log(`Reset Link: ${resetLink}`);
    console.log('='.repeat(80) + '\n');
  }

  await sendEmail({ to: email, subject: 'Password Reset Request - Hostix', html, emailType: 'ForgotPassword' });
};

// ─── OTP verification email ────────────────────────────────────────────────────
export const sendOtpEmail = async (
  email: string,
  otp: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-bottom: 20px; text-align: center;">Verify Your Email</h2>
        <p style="color: #666; line-height: 1.6;">Hello,</p>
        <p style="color: #666; line-height: 1.6;">
          Your One Time Password (OTP) for account verification is:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #7C3AED; background-color: #F3EEFF; padding: 16px 28px; border-radius: 12px; border: 2px dashed #7C3AED; display: inline-block;">
            ${otp}
          </span>
        </div>
        <p style="color: #999; font-size: 13px; margin-top: 30px; text-align: center;">
          ⏱ This OTP is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
        </p>
        <p style="color: #999; font-size: 12px; text-align: center;">Hostix System</p>
      </div>
    </div>
  `;

  await sendEmail({ to: email, subject: 'Your Verification Code - Hostix', html });
};
