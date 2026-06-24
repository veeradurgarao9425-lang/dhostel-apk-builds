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
    // Fail fast instead of hanging forever when the SMTP socket can't connect
    // (e.g. host blocks outbound 465/587). Without these, sendMail() hangs until
    // the client's HTTP timeout fires and the user sees a misleading network error.
    connectionTimeout: 15000, // 15s to establish the TCP connection
    greetingTimeout: 10000,   // 10s to receive the SMTP greeting
    socketTimeout: 20000,     // 20s of socket inactivity
  });
};

// ─── Parse "Name <email>" or bare "email" into Brevo's sender shape ─────────────
const parseSender = (): { email: string; name: string } => {
  const raw = process.env.EMAIL_FROM || process.env.EMAIL_USER || '';
  const match = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim() || 'Hosix Hostel', email: match[2].trim() };
  return { name: 'Hosix Hostel', email: raw.trim() };
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

// ─── Send via SMTP (nodemailer) — local-dev fallback when no Brevo key is set ────
const sendViaSmtp = async (options: EmailOptions): Promise<void> => {
  const from = process.env.EMAIL_FROM || `"Hosix Hostel" <${process.env.EMAIL_USER}>`;

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

// ─── Core send function ────────────────────────────────────────────────────────
// Prefers the Brevo HTTP API (works on hosts like Render that block SMTP ports).
// Falls back to SMTP when BREVO_API_KEY is not configured (e.g. local dev).
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    if (process.env.BREVO_API_KEY) {
      await sendViaBrevo(options);
    } else {
      await sendViaSmtp(options);
    }
  } catch (error: any) {
    console.error('❌ Send email FAILED:', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// ─── Password reset email ──────────────────────────────────────────────────────
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  userName: string
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
        <p style="color: #666; line-height: 1.6;">Or copy and paste this link in your browser:</p>
        <p style="background-color: #f0f0f0; padding: 10px; border-radius: 4px; word-break: break-all; color: #333;">
          ${resetLink}
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
        </p>
        <p style="color: #999; font-size: 12px;">Hosix System</p>
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

  await sendEmail({ to: email, subject: 'Password Reset Request - Hosix', html });
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
        <p style="color: #999; font-size: 12px; text-align: center;">Hosix System</p>
      </div>
    </div>
  `;

  await sendEmail({ to: email, subject: 'Your Verification Code - Hosix', html });
};
