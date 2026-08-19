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

// ─── Direct Core send function using standard Nodemailer SMTP ────────────────
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const from = process.env.EMAIL_FROM || `"Hostix Support" <${process.env.EMAIL_USER || 'hostixhelp@gmail.com'}>`;
  const transporter = createTransporter();

  console.log(`📧 Sending email to: ${options.to}  |  Subject: ${options.subject}`);

  // Create clean plain text version for email clients that don't render HTML
  const plainText = options.html ? options.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';

  const info = await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    text: plainText,
    html: options.html,
    headers: {
      'X-Auto-Response-Suppress': 'All',
      'Auto-Submitted': 'auto-generated',
      'X-Priority': '1',
      'Importance': 'High',
    },
    attachments: options.attachments,
  });

  console.log(`✅ Email delivered successfully: ${info.messageId}`);
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
  const subject = `${otp} is your Hostix verification code`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #6366f1; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Hostix</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px; margin-bottom: 0;">Smart PG & Hostel Management</p>
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
          <h3 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 700; text-align: center;">Account Verification Code</h3>
          <p style="color: #475569; font-size: 14px; line-height: 22px; text-align: center; margin-bottom: 24px;">Please use the following one-time password (OTP) to complete your verification:</p>
          <div style="text-align: center; margin: 24px 0;">
            <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; background-color: #f1f5f9; padding: 16px 28px; border-radius: 12px; display: inline-block; font-family: 'Courier New', Courier, monospace;">
              ${otp}
            </div>
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px; margin-bottom: 0;">
            This code will expire in 10 minutes. If you did not request this code, you can safely ignore this email.
          </p>
        </div>
        <div style="border-top: 1px solid #f1f5f9; margin-top: 28px; padding-top: 16px; text-align: center;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; Hostix Systems. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to: email, subject, html, emailType: 'OTP' });
};

// ─── New Joiner Welcome Email (Sent to Student/Tenant) ─────────────────────────
export const sendNewJoinerStudentEmail = async (params: {
  email: string;
  studentName: string;
  hostelName: string;
  roomNumber?: string | null;
  bedNumber?: string | null;
  admissionDate: string;
  monthlyRent?: number | null;
  admissionFee?: number | null;
}): Promise<void> => {
  const {
    email,
    studentName,
    hostelName,
    roomNumber,
    bedNumber,
    admissionDate,
    monthlyRent,
    admissionFee,
  } = params;

  if (!email || !email.includes('@')) return;

  const subject = `Welcome to ${hostelName}! Your Admission & Room Confirmation`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #18181B 0%, #27272A 100%); padding: 30px 24px; text-align: center;">
          <h1 style="color: #EA580C; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">HOSTIX</h1>
          <p style="color: #E4E4E7; font-size: 14px; margin-top: 6px; margin-bottom: 0;">Smart PG & Hostel Management</p>
        </div>

        <div style="padding: 28px 24px;">
          <h2 style="color: #0F172A; font-size: 19px; font-weight: 700; margin-top: 0; margin-bottom: 8px;">
            Welcome to your new home, ${studentName}! 🎉
          </h2>
          <p style="color: #475569; font-size: 14px; line-height: 22px; margin-top: 0; margin-bottom: 20px;">
            Your admission at <strong>${hostelName}</strong> has been confirmed successfully. Here is a summary of your room and stay details:
          </p>

          <!-- Stay Details Card -->
          <div style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #1E293B;">
              <tr>
                <td style="padding: 6px 0; color: #64748B; font-weight: 600; width: 45%;">Hostel:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #0F172A;">${hostelName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Room Assigned:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #EA580C;">${roomNumber || 'Awaiting Room Allocation'}</td>
              </tr>
              ${bedNumber ? `
              <tr>
                <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Bed:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #0F172A;">Bed #${bedNumber}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Check-in / Admission:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #0F172A;">${admissionDate}</td>
              </tr>
              ${monthlyRent ? `
              <tr>
                <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Monthly Rent:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #059669;">₹${Number(monthlyRent).toLocaleString('en-IN')} / month</td>
              </tr>
              ` : ''}
              ${admissionFee ? `
              <tr>
                <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Admission / Deposit:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #0F172A;">₹${Number(admissionFee).toLocaleString('en-IN')}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- Mobile App Access Notice -->
          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <h3 style="color: #0F172A; font-size: 14px; font-weight: 700; margin: 0 0 6px 0;">📱 Access Your Resident Mobile Portal</h3>
            <p style="color: #64748B; font-size: 12.5px; line-height: 18px; margin: 0;">
              You can log in to the Hostix Resident App anytime using your registered email (<strong>${email}</strong>) to pay dues, raise maintenance requests, view daily mess menus, and chat with roommates.
            </p>
          </div>

          <p style="color: #94A3B8; font-size: 12px; line-height: 18px; margin: 0;">
            If you have questions about your check-in or room amenities, please reach out to your hostel management or warden.
          </p>
        </div>

        <div style="background-color: #F1F5F9; padding: 14px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
          <p style="color: #94A3B8; font-size: 11px; margin: 0;">&copy; Hostix Cloud System • automated admission notification</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to: email, subject, html, emailType: 'NewJoiner' });
};

// ─── New Joiner Owner Alert Email (Sent to Hostel Owner) ─────────────────────────
export const sendNewJoinerOwnerAlertEmail = async (params: {
  ownerEmail: string;
  ownerName: string;
  studentName: string;
  studentPhone: string;
  studentEmail?: string | null;
  hostelName: string;
  roomNumber?: string | null;
  bedNumber?: string | null;
  admissionDate: string;
  monthlyRent?: number | null;
  admissionFee?: number | null;
}): Promise<void> => {
  const {
    ownerEmail,
    ownerName,
    studentName,
    studentPhone,
    studentEmail,
    hostelName,
    roomNumber,
    bedNumber,
    admissionDate,
    monthlyRent,
    admissionFee,
  } = params;

  if (!ownerEmail || !ownerEmail.includes('@')) return;

  const subject = `New Resident Admitted: ${studentName} — ${hostelName}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #18181B 0%, #27272A 100%); padding: 24px; text-align: center;">
          <h1 style="color: #EA580C; margin: 0; font-size: 22px; font-weight: 800;">HOSTIX OWNER DISPATCH</h1>
          <p style="color: #D4D4D8; font-size: 13px; margin-top: 4px; margin-bottom: 0;">New Resident Admission Alert</p>
        </div>

        <div style="padding: 24px;">
          <p style="color: #334155; font-size: 14px; line-height: 22px; margin-top: 0;">
            Hello <strong>${ownerName || 'Hostel Owner'}</strong>,<br>
            A new resident has been added to <strong>${hostelName}</strong>.
          </p>

          <!-- Resident Dossier -->
          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
            <h3 style="color: #0F172A; font-size: 14px; font-weight: 700; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
              Resident Dossier
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1E293B;">
              <tr>
                <td style="padding: 5px 0; color: #64748B; width: 40%;">Name:</td>
                <td style="padding: 5px 0; font-weight: 700;">${studentName}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #64748B;">Contact Phone:</td>
                <td style="padding: 5px 0; font-weight: 700; color: #2563EB;">${studentPhone || 'N/A'}</td>
              </tr>
              ${studentEmail ? `
              <tr>
                <td style="padding: 5px 0; color: #64748B;">Email:</td>
                <td style="padding: 5px 0; font-weight: 700;">${studentEmail}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 5px 0; color: #64748B;">Room Allocation:</td>
                <td style="padding: 5px 0; font-weight: 700; color: #EA580C;">${roomNumber ? `Room ${roomNumber}${bedNumber ? ` (Bed ${bedNumber})` : ''}` : 'Unallocated'}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #64748B;">Admission Date:</td>
                <td style="padding: 5px 0; font-weight: 700;">${admissionDate}</td>
              </tr>
              ${monthlyRent ? `
              <tr>
                <td style="padding: 5px 0; color: #64748B;">Agreed Rent:</td>
                <td style="padding: 5px 0; font-weight: 700; color: #059669;">₹${Number(monthlyRent).toLocaleString('en-IN')} / month</td>
              </tr>
              ` : ''}
              ${admissionFee ? `
              <tr>
                <td style="padding: 5px 0; color: #64748B;">Admission Fee / Deposit:</td>
                <td style="padding: 5px 0; font-weight: 700;">₹${Number(admissionFee).toLocaleString('en-IN')}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <p style="color: #64748B; font-size: 12px; line-height: 18px; margin: 0;">
            This profile and rent ledger have been synchronized with your Hostix Owner App.
          </p>
        </div>

        <div style="background-color: #F1F5F9; padding: 12px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
          <p style="color: #94A3B8; font-size: 11px; margin: 0;">Hostix Automated Dispatch System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to: ownerEmail, subject, html, emailType: 'NewJoinerOwnerAlert' });
};
