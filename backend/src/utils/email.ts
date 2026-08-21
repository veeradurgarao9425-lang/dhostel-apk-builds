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

// Helper to parse sender
const parseSender = () => {
  const rawFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'hostixhelp@gmail.com';
  const match = rawFrom.match(/^(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)$/);
  if (match) {
    return { name: match[1]?.trim() || 'Hostix Support', email: match[2]?.trim() || rawFrom };
  }
  return { name: 'Hostix Support', email: rawFrom };
};

// ─── Send via Brevo HTTP API (port 443) ────────────────────────────────────────
const sendViaBrevo = async (options: EmailOptions): Promise<boolean> => {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  if (!apiKey) return false;

  // Brevo HTTP API requires a REST API key (starts with 'xkeysib-').
  // If user configured an SMTP password (starts with 'xsmtpsib-'), log a helpful note.
  if (apiKey.startsWith('xsmtpsib-')) {
    console.warn('⚠️ BREVO_API_KEY starts with "xsmtpsib-", which is an SMTP key. Brevo REST API requires an API key starting with "xkeysib-".');
    return false;
  }

  const sender = parseSender();
  const payload: any = {
    sender: { name: sender.name, email: sender.email },
    to: [{ email: options.to }],
    subject: options.subject,
    htmlContent: options.html,
  };

  if (options.attachments && options.attachments.length > 0) {
    payload.attachment = options.attachments.map((a) => ({
      name: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(a.content).toString('base64'),
    }));
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    signal: AbortSignal.timeout(6000),
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo HTTP API ${res.status}: ${text}`);
  }
  console.log(`✅ Email sent via Brevo HTTP API to: ${options.to}`);
  return true;
};

// ─── Send via Resend HTTP API (port 443) ───────────────────────────────────────
const sendViaResend = async (options: EmailOptions): Promise<boolean> => {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return false;

  const sender = parseSender();
  const payload: any = {
    from: `${sender.name} <${sender.email}>`,
    to: [options.to],
    subject: options.subject,
    html: options.html,
  };

  if (options.attachments && options.attachments.length > 0) {
    payload.attachments = options.attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(a.content).toString('base64'),
    }));
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(6000),
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend HTTP API ${res.status}: ${text}`);
  }
  console.log(`✅ Email sent via Resend HTTP API to: ${options.to}`);
  return true;
};

// ─── Send via SendGrid HTTP API (port 443) ─────────────────────────────────────
const sendViaSendGrid = async (options: EmailOptions): Promise<boolean> => {
  const apiKey = (process.env.SENDGRID_API_KEY || '').trim();
  if (!apiKey) return false;

  const sender = parseSender();
  const payload: any = {
    personalizations: [{ to: [{ email: options.to }] }],
    from: { email: sender.email, name: sender.name },
    subject: options.subject,
    content: [{ type: 'text/html', value: options.html }],
  };

  if (options.attachments && options.attachments.length > 0) {
    payload.attachments = options.attachments.map((a) => ({
      content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(a.content).toString('base64'),
      filename: a.filename,
      type: a.contentType || 'application/octet-stream',
      disposition: 'attachment',
    }));
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    signal: AbortSignal.timeout(6000),
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SendGrid HTTP API ${res.status}: ${text}`);
  }
  console.log(`✅ Email sent via SendGrid HTTP API to: ${options.to}`);
  return true;
};

// ─── Send via EmailJS HTTP API (port 443) ────────────────────────────────────
const sendViaEmailJS = async (options: EmailOptions): Promise<boolean> => {
  const serviceId = (process.env.EMAILJS_SERVICE_ID || '').trim();
  const publicKey = (process.env.EMAILJS_PUBLIC_KEY || process.env.EMAILJS_USER_ID || '').trim();
  const privateKey = (process.env.EMAILJS_PRIVATE_KEY || process.env.EMAILJS_ACCESS_TOKEN || '').trim();

  // Determine template ID based on email type
  const isOtp = options.emailType === 'OTP';
  const otpTemplateId = (process.env.EMAILJS_OTP_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID || '').trim();
  const reportTemplateId = (process.env.EMAILJS_REPORT_TEMPLATE_ID || process.env.EMAILJS_GENERAL_TEMPLATE_ID || '').trim();
  
  const templateId = isOtp ? otpTemplateId : reportTemplateId;

  if (!serviceId || !templateId || !publicKey) return false;

  console.log(`📨 Sending ${isOtp ? 'OTP' : 'General/Report'} via EmailJS | to: ${options.to}`);

  const otpMatch = options.subject.match(/\d{6}/) || options.html.match(/\d{6}/);
  const passcode = otpMatch ? otpMatch[0] : '';
  const sender = parseSender();

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    signal: AbortSignal.timeout(6000),
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey || undefined,
      template_params: {
        to_email: options.to,
        email: options.to,
        recipient: options.to,
        to_name: options.to.split('@')[0],
        passcode: passcode,
        otp: passcode,
        code: passcode,
        verification_code: passcode,
        subject: options.subject,
        message: options.html,
        html_message: options.html,
        from_name: 'Hostix Support',
        reply_to: sender.email || 'hostixhelp@gmail.com',
        time: '10 minutes',
        expiry: '10 minutes',
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EmailJS API ${res.status}: ${text}`);
  }
  console.log(`✅ Email sent via EmailJS successfully to: ${options.to}`);
  return true;
};

// ─── Direct Core send function with HTTPS API and SMTP Fallback ──────────────
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const from = process.env.EMAIL_FROM || `"Hostix Support" <${process.env.EMAIL_USER || 'hostixhelp@gmail.com'}>`;

  console.log(`📧 Sending email (${options.emailType || 'General'}) to: ${options.to} | Subject: ${options.subject}`);

  // Create clean plain text version for email clients that don't render HTML
  const plainText = options.html ? options.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';

  try {
    // 1. For OTP emails: Use dedicated EmailJS OTP template
    if (options.emailType === 'OTP' && process.env.EMAILJS_SERVICE_ID) {
      try {
        const sent = await sendViaEmailJS(options);
        if (sent) return;
      } catch (ejsErr: any) {
        console.warn('⚠️ EmailJS OTP delivery notice:', ejsErr.message);
      }
    }

    // 2. For Reports / General emails: Try EmailJS General Template if configured
    if (options.emailType !== 'OTP' && process.env.EMAILJS_SERVICE_ID && (process.env.EMAILJS_REPORT_TEMPLATE_ID || process.env.EMAILJS_GENERAL_TEMPLATE_ID)) {
      try {
        const sent = await sendViaEmailJS(options);
        if (sent) return;
      } catch (ejsErr: any) {
        console.warn('⚠️ EmailJS Report delivery notice:', ejsErr.message);
      }
    }

    // 3. For Reports, Notifications, and general emails: Try Brevo / Resend / SendGrid if available
    if (process.env.BREVO_API_KEY) {
      try {
        const sent = await sendViaBrevo(options);
        if (sent) return;
      } catch (brevoErr: any) {
        console.warn('⚠️ Brevo API delivery notice:', brevoErr.message);
      }
    }
    if (process.env.RESEND_API_KEY) {
      try {
        const sent = await sendViaResend(options);
        if (sent) return;
      } catch (resendErr: any) {
        console.warn('⚠️ Resend API delivery notice:', resendErr.message);
      }
    }
    if (process.env.SENDGRID_API_KEY) {
      try {
        const sent = await sendViaSendGrid(options);
        if (sent) return;
      } catch (sgErr: any) {
        console.warn('⚠️ SendGrid API delivery notice:', sgErr.message);
      }
    }

    // 4. SMTP Transporter fallback (uses standard Gmail SMTP credentials)
    const transporter = createTransporter();
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

    console.log(`✅ Email delivered successfully via SMTP: ${info.messageId}`);
  } catch (err: any) {
    console.warn(`⚠️ Email delivery failed for ${options.to} (${err.message}).`);
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
  const subject = `${otp} is your Hostix verification code`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
      <!-- Hidden Preheader to prevent spam classification -->
      <div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        Your Hostix verification code is ${otp}. Valid for 10 minutes.
      </div>
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

  console.log('\n' + '='.repeat(70));
  console.log(`🔐 OTP VERIFICATION CODE DISPATCH`);
  console.log(`   To:  ${email}`);
  console.log(`   OTP: ${otp}`);
  console.log(`   Valid for: 10 minutes`);
  console.log('='.repeat(70) + '\n');

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

/**
 * ─── Password Reset Security Notification Email ─────────────────────────────
 * Triggered whenever a student or owner password is reset by developer / admin.
 */
export const sendPasswordResetNotificationEmail = async (params: {
  recipientEmail: string;
  recipientName: string;
  userType: 'Student / Resident' | 'Hostel Owner' | 'User';
  newPassword?: string;
}) => {
  const { recipientEmail, recipientName, userType, newPassword } = params;
  if (!recipientEmail || !recipientEmail.includes('@')) return;

  const subject = `Security Alert: Your Hostix Account Password Was Changed`;
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
          <h1 style="color: #EA580C; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">HOSTIX SECURITY NOTICE</h1>
          <p style="color: #D4D4D8; font-size: 13px; margin-top: 4px; margin-bottom: 0;">Account Credential Update</p>
        </div>

        <div style="padding: 24px;">
          <p style="color: #334155; font-size: 14px; line-height: 22px; margin-top: 0;">
            Hello <strong>${recipientName || 'User'}</strong>,
          </p>
          <p style="color: #475569; font-size: 14px; line-height: 22px;">
            Your Hostix <strong>${userType}</strong> account password has recently been updated.
          </p>

          ${newPassword ? `
          <div style="background-color: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; margin: 16px 0; text-align: center;">
            <span style="color: #64748B; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Temporary Access Password</span>
            <span style="font-family: monospace; font-size: 18px; font-weight: 800; color: #0F172A; letter-spacing: 2px;">${newPassword}</span>
          </div>
          ` : ''}

          <!-- Alert Box -->
          <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <p style="color: #92400E; font-size: 13px; line-height: 20px; margin: 0; font-weight: 700;">
              ⚠️ If you did not request this change or need login assistance, please contact your Admin / Developer immediately:
            </p>
            <div style="margin-top: 10px; color: #78350F; font-size: 13px; line-height: 20px;">
              <strong>Developer / Admin:</strong> Durgarao<br>
              <strong>Contact Phone:</strong> <a href="tel:6303359425" style="color: #EA580C; text-decoration: none; font-weight: 800;">6303359425</a>
            </div>
          </div>

          <p style="color: #64748B; font-size: 12px; line-height: 18px; margin: 0;">
            You can now log in to the Hostix App with your updated credentials.
          </p>
        </div>

        <div style="background-color: #F1F5F9; padding: 14px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
          <p style="color: #94A3B8; font-size: 11px; margin: 0;">Hostix Ecosystem Security • Automated Dispatch</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to: recipientEmail, subject, html, emailType: 'PasswordResetAlert' }).catch((err) => {
    console.error('Password reset email dispatch notice:', err?.message || err);
  });
};

