// QR Signup form: v2 - fixed regex, toast CSS, no-redirect HTML serving
import dotenv from 'dotenv';
// Load environment variables FIRST - before any module that reads process.env
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import { setupSocket } from './socket/index.js';
import authRoutes from './routes/auth.routes.js';
import db from './config/database.js';
import hostelRoutes from './routes/hostel.routes.js';
import userRoutes from './routes/user.routes.js';
import roomRoutes from './routes/roomRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import feeRoutes from './routes/feeRoutes.js';
import monthlyFeeRoutes from './routes/monthlyFeeRoutes.js';
import incomeRoutes from './routes/incomeRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { streamFromR2 } from './services/r2Service.js';
import activityRoutes from './routes/activityRoutes.js';
import amenitiesRoutes from './routes/amenities.routes.js';
import relationsRoutes from './routes/relationsRoutes.js';
import idProofTypesRoutes from './routes/idProofTypesRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import noticeRoutes from './routes/noticeRoutes.js';
import guestRoutes from './routes/guestRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import leaveVisitorRoutes from './routes/leaveVisitorRoutes.js';
import messMenuRoutes from './routes/messMenuRoutes.js';
import tenantExpenseRoutes from './routes/tenantExpenseRoutes.js';
import splitsRoutes from './routes/splitsRoutes.js';
import growthRoutes from './routes/growthRoutes.js';
import messSkipRoutes from './routes/messSkipRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import developerRoutes from './routes/developer.routes.js';
import legalRoutes from './routes/legalRoutes.js';
import { startMonthlyFeesGenerationJob } from './jobs/monthlyFeesGeneration.js';
import { startGuestOverstayJob } from './jobs/guestOverstay.js';
import { startChatResetJob } from './jobs/chatReset.js';
import { startSubscriptionCheckJob } from './jobs/subscriptionCheck.js';
import { startWeeklyReportsJob } from './jobs/weeklyReports.js';
import { startMonthlyReportsJob } from './jobs/monthlyReports.js';
import { startFeeRemindersJob } from './jobs/feeReminders.js';
import { startOwnerDailyAlertsJob } from './jobs/ownerDailyAlerts.js';
import { startDailyExcelReportsJob } from './jobs/dailyExcelReports.js';
import { startTenantFriendlyRemindersJob } from './jobs/tenantFriendlyReminders.js';
import { sendNotificationToHostelOwner } from './utils/notification.js';
import { checkHostelUniqueIdentifiers } from './utils/validation.js';
import { processFileUpload } from './utils/fileUpload.js';
import { sanitizeInputMiddleware, developerLoginLimiter } from './middleware/security.js';


// Start Background Jobs
startMonthlyFeesGenerationJob();
startGuestOverstayJob();
startChatResetJob();
startSubscriptionCheckJob();
startWeeklyReportsJob();
startMonthlyReportsJob();
startFeeRemindersJob();
startOwnerDailyAlertsJob();
startDailyExcelReportsJob();
startTenantFriendlyRemindersJob();


const app = express();

// Trust the first hop (Nginx/reverse proxy in front of this process).
// Without this, express-rate-limit keys every request off the proxy's IP
// instead of the real client IP, so ALL users share one rate-limit bucket —
// a handful of logins/OTP sends across the whole user base would lock
// everyone out simultaneously.
app.set('trust proxy', 1);

const httpServer = createServer(app);
setupSocket(httpServer);

const PORT = parseInt(process.env.PORT || '8081', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Get allowed origins from environment or use defaults
const getAllowedOrigins = (): string[] => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  }
  // Allow localhost for frontend development even in production, and any specific production domains
  return [
    'http://localhost:3000', 
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175'
  ];
};

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,                  // max 200 attempts per 15-min window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts, please try again after 15 minutes.' },
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  // Many tenants of the same hostel share one public IP (hostel WiFi/NAT), so
  // this bucket is per-building, not per-person — keep enough headroom that a
  // handful of tenants requesting an OTP in the same minute (e.g. right after
  // a payment reminder push) don't lock each other out, while still bounding
  // SMS-bombing abuse from a single source.
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many OTP requests, please wait before trying again.' },
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", ...getAllowedOrigins()],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for PDF/Excel file downloads
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInputMiddleware);

// Request Logger
app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.url}`);
  next();
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Serve Cloudflare R2 media files via proxy (with path traversal protection)
app.get('/api/media/*', async (req, res) => {
  try {
    let key = req.params[0];
    if (!key) return res.status(400).send('Missing media key');
    
    // Sanitize path to prevent directory traversal
    key = path.normalize(key).replace(/^(\.\.[\/\\])+/, '');

    if (key.includes('hostix-media/')) {
      key = key.split('hostix-media/')[1];
    }
    const success = await streamFromR2(key, res);
    if (!success) {
      return res.status(404).send('Media file not found');
    }
  } catch (err: any) {
    console.error('Media proxy error:', err.message);
    res.status(500).send('Failed to fetch media');
  }
});

// API Routes — OTP and auth routes have rate limiting applied
app.use('/api/auth/send-otp', otpLimiter);
app.use('/api/auth/tenant/send-otp', otpLimiter);
app.use('/api/auth/verify-reset-otp', otpLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/reports', reportRoutes); // High-accuracy report/dashboard logic
app.use('/api/analytics', reportRoutes); // Keep for mobile mapping
app.use('/api/dashboard', reportRoutes); // Map dashboard to reports for owner-stats
app.use('/api/hostels', hostelRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/monthly-fees', monthlyFeeRoutes);
app.use('/api/month-fees', monthlyFeeRoutes); // Alias for common typo
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/amenities', amenitiesRoutes);
app.use('/api/relations', relationsRoutes);
app.use('/api/id-proof-types', idProofTypesRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/requests', leaveVisitorRoutes);
app.use('/api/mess-menu', messMenuRoutes);
app.use('/api/tenant-expenses', tenantExpenseRoutes);
app.use('/api/splits', splitsRoutes);
app.use('/api/growth', growthRoutes);
app.use('/api/mess', messSkipRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/developer/login', developerLoginLimiter);
app.use('/api/developer/request-otp', developerLoginLimiter);
app.use('/api/developer', developerRoutes);
app.use(legalRoutes);
// Multer storage for the public QR signup Aadhaar photos
const qrSignupUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `qr-signup-${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed for Aadhaar photos'));
    }
    cb(null, true);
  },
});// Public QR tenant signup — serves self-contained HTML (works on any device/IP)
app.get('/api/public/qr-signup', async (req, res) => {
  const hostelId = req.query.hostelId as string;
  const roomId   = req.query.roomId   as string | undefined;
  const bedId    = req.query.bedId    as string | undefined;
  const bedName  = req.query.bedName  as string | undefined;

  if (!hostelId) {
    return res.status(400).send('<h2 style="font-family:sans-serif;color:#7f1d1d;text-align:center;margin-top:40px;">Missing hostel ID link</h2>');
  }

  const numHostelId = parseInt(hostelId, 10);
  let hostelName = 'Hostel Admission';
  let hostelCity = '';
  let hostelAddress = '';

  if (!isNaN(numHostelId)) {
    try {
      const hostel = await db('hostel_master').where('hostel_id', numHostelId).first();
      if (hostel) {
        hostelName = hostel.hostel_name || hostelName;
        hostelCity = hostel.city || '';
        hostelAddress = hostel.address || '';
      }
    } catch (e) {
      console.error('Error fetching hostel details for QR signup:', e);
    }
  }

  const roomBanner = roomId
    ? `<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:12px 16px;margin-bottom:18px;"><div style="font-size:11px;color:#166534;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">🏠 Pre-assigned Allocation</div><div style="font-size:14px;color:#15803d;font-weight:700;">Room: <strong style="color:#14532d;">${roomId}</strong>${bedName ? ` &nbsp;•&nbsp; Bed: <strong style="color:#14532d;">${bedName}</strong>` : ''}</div></div>`
    : '';

  const postUrl = `/api/public/qr-signup?hostelId=${encodeURIComponent(hostelId)}${roomId ? `&roomId=${encodeURIComponent(roomId)}` : ''}${bedId ? `&bedId=${encodeURIComponent(bedId)}` : ''}${bedName ? `&bedName=${encodeURIComponent(bedName)}` : ''}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0"/>
  <title>${hostelName} - Tenant Registration</title>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    *,*::before,*::after{box-sizing:border-box;}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#F8FAFC;margin:0;min-height:100vh;padding:16px 12px 60px;color:#1E293B;}
    .card{max-width:520px;margin:0 auto;padding:24px 20px;background:#ffffff;border-radius:24px;box-shadow:0 10px 30px -10px rgba(0,0,0,0.08);border:1px solid #E2E8F0;position:relative;}
    .brand-hero{background:linear-gradient(135deg,#6366F1,#4F46E5);padding:18px 20px;border-radius:18px;margin-bottom:20px;color:#FFF;box-shadow:0 8px 24px -6px rgba(79,70,229,0.35);display:flex;align-items:center;gap:14px;}
    .brand-logo{width:46px;height:46px;border-radius:12px;background:rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
    .brand-title{font-size:17px;font-weight:800;line-height:1.25;margin-bottom:2px;}
    .brand-sub{font-size:12px;opacity:0.9;font-weight:500;}
    .stepper{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;position:relative;padding:0 12px;}
    .stepper::before{content:'';position:absolute;top:15px;left:34px;right:34px;height:3px;background:#E2E8F0;z-index:1;border-radius:3px;}
    .sp{position:absolute;top:15px;left:34px;height:3px;background:#4F46E5;z-index:2;border-radius:3px;transition:width .3s ease;max-width:calc(100% - 68px);}
    .stp{position:relative;z-index:3;display:flex;flex-direction:column;align-items:center;gap:5px;width:64px;}
    .sc{width:30px;height:30px;border-radius:50%;background:#F1F5F9;border:2.5px solid #E2E8F0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#94A3B8;transition:all .3s ease;}
    .stp.active .sc{background:#fff;border-color:#4F46E5;color:#4F46E5;box-shadow:0 0 0 4px rgba(79,70,229,.15);transform:scale(1.08);}
    .stp.done .sc{background:#4F46E5;border-color:#4F46E5;color:#fff;}
    .sl{font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;transition:color .3s;text-align:center;}
    .stp.active .sl{color:#4F46E5;}.stp.done .sl{color:#1E293B;}
    .step{display:none;animation:si .25s ease;}.step.active{display:block;}
    @keyframes si{from{opacity:0;transform:translateX(6px)}to{opacity:1;transform:none}}
    .field{margin-bottom:15px;}
    lbl{display:block;font-size:11.5px;font-weight:700;color:#475569;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;}
    .req{color:#EF4444;margin-left:3px;}
    input,select,textarea{width:100%;padding:12px 14px;border:1.5px solid #CBD5E1;border-radius:12px;font-size:14.5px;color:#1E293B;outline:none;transition:all .2s;background:#fff;font-family:inherit;}
    textarea{resize:vertical;min-height:75px;}
    input:focus,select:focus,textarea:focus{border-color:#4F46E5;box-shadow:0 0 0 3px rgba(79,70,229,.15);}
    .ef input,.ef select,.ef textarea{border-color:#EF4444;background:#FEF2F2;}
    .em{display:block;color:#EF4444;font-size:11.5px;margin-top:4px;font-weight:600;min-height:14px;}
    .btns{display:flex;gap:12px;margin-top:24px;}
    .btn{flex:1;padding:13px;border-radius:14px;font-weight:700;font-size:15px;cursor:pointer;border:none;transition:all .2s ease;display:flex;align-items:center;justify-content:center;gap:6px;}
    .bp{background:linear-gradient(135deg,#6366F1,#4F46E5);color:#fff;box-shadow:0 6px 18px -4px rgba(79,70,229,.4);}
    .bp:hover{box-shadow:0 8px 22px -4px rgba(79,70,229,.5);transform:translateY(-1px);}
    .bo{background:#F8FAFC;border:1.5px solid #E2E8F0;color:#475569;}
    .bo:hover{background:#F1F5F9;border-color:#CBD5E1;}
    .fw input[type=file]{position:absolute;width:1px;height:1px;opacity:0;}
    .fb{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px 10px;border:2px dashed #CBD5E1;border-radius:14px;background:#F8FAFC;color:#6366F1;font-size:12.5px;font-weight:700;cursor:pointer;transition:all .2s;text-align:center;position:relative;overflow:hidden;min-height:110px;}
    .fb:hover{background:#EEF2FF;border-color:#818CF8;}
    .fb.has{border-style:solid;border-color:#4F46E5;background:#F5F3FF;padding:6px;}
    .preview-img{width:100%;height:100px;object-fit:cover;border-radius:10px;display:none;}
    .clear-btn{position:absolute;top:6px;right:6px;width:24px;height:24px;background:#EF4444;color:#fff;border-radius:50%;display:none;align-items:center;justify-content:center;font-size:12px;font-weight:900;border:none;cursor:pointer;z-index:5;line-height:1;box-shadow:0 2px 6px rgba(0,0,0,0.2);}
    .clear-btn:hover{background:#DC2626;}
    #toast{position:fixed;top:16px;left:50%;transform:translateX(-50%) translateY(-120px);background:#1E293B;color:#fff;padding:12px 20px;border-radius:100px;font-size:13.5px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.2);transition:transform .4s cubic-bezier(.34,1.56,.64,1);z-index:1000;display:flex;align-items:center;gap:8px;white-space:nowrap;max-width:90%;text-align:center;}
    #toast.show{transform:translateX(-50%) translateY(0);}
    #ldr{position:absolute;inset:0;background:rgba(255,255,255,.95);z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s;border-radius:24px;backdrop-filter:blur(4px);}
    #ldr.show{opacity:1;pointer-events:all;}
    .spin{width:44px;height:44px;border:4px solid #EEF2FF;border-top-color:#4F46E5;border-radius:50%;animation:sp .7s linear infinite;margin-bottom:14px;}
    @keyframes sp{to{transform:rotate(360deg)}}
    #ok{display:none;text-align:center;padding:40px 10px 20px;}
    .ck{width:80px;height:80px;background:linear-gradient(135deg,#10B981,#059669);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin:0 auto 20px;color:#fff;box-shadow:0 12px 30px rgba(16,185,129,.35);}
    .ck i{width:42px;height:42px;color:#fff;}
  </style>
</head>
<body>
  <div id="toast"><i data-lucide="alert-circle" style="width:16px;height:16px;color:#F87171;"></i> <span id="tm">Error</span></div>
  
  <div class="card" id="mc">
    <div id="ldr"><div class="spin"></div><div style="color:#4F46E5;font-weight:700;font-size:15px;">Submitting your application...</div></div>
    
    <div id="fc">
      <!-- Branded Header with Hostel Name -->
      <div class="brand-hero">
        <div class="brand-logo">🏢</div>
        <div>
          <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:0.8px;opacity:0.85;font-weight:800;">Self Registration</div>
          <div class="brand-title">${hostelName}</div>
          ${hostelCity ? `<div class="brand-sub">📍 ${hostelCity}</div>` : `<div class="brand-sub">Hostix Smart Admission</div>`}
        </div>
      </div>

      ${roomBanner}

      <div class="stepper">
        <div class="sp" id="prog" style="width:0%"></div>
        <div class="stp active" id="n1"><div class="sc" id="c1">1</div><div class="sl">Personal</div></div>
        <div class="stp" id="n2"><div class="sc" id="c2">2</div><div class="sl">Guardian</div></div>
        <div class="stp" id="n3"><div class="sc" id="c3">3</div><div class="sl">Verification</div></div>
      </div>

      <form id="frm" enctype="multipart/form-data">
        <!-- STEP 1: Personal Details -->
        <div class="step active" id="p1">
          <div class="field">
            <lbl>First Name<span class="req">*</span></lbl>
            <input id="first_name" name="first_name" placeholder="e.g. Ramesh"/>
            <span class="em" id="e1"></span>
          </div>
          <div class="field">
            <lbl>Last Name</lbl>
            <input id="last_name" name="last_name" placeholder="e.g. Kumar"/>
          </div>
          <div class="field">
            <lbl>Phone Number<span class="req">*</span></lbl>
            <input id="phone" name="phone" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number"/>
            <span class="em" id="e2"></span>
          </div>
          <div class="field">
            <lbl>Email Address</lbl>
            <input id="email" name="email" type="email" placeholder="your@email.com"/>
            <span class="em" id="e3"></span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="field">
              <lbl>Date of Birth<span class="req">*</span></lbl>
              <input id="dob" name="date_of_birth" type="date"/>
              <span class="em" id="e_dob"></span>
            </div>
            <div class="field">
              <lbl>Gender<span class="req">*</span></lbl>
              <select id="gender" name="gender">
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <span class="em" id="e_gender"></span>
            </div>
          </div>
          <div class="btns">
            <button type="button" class="btn bp" id="b1">Continue <i data-lucide="chevron-right" style="width:16px;height:16px;"></i></button>
          </div>
        </div>

        <!-- STEP 2: Guardian Details -->
        <div class="step" id="p2">
          <p style="font-size:13px;color:#64748B;margin:0 0 16px;line-height:1.4;">Emergency guardian contact information is required for admission.</p>
          <div class="field">
            <lbl>Guardian Name<span class="req">*</span></lbl>
            <input id="gname" name="guardian_name" placeholder="Parent / Guardian full name"/>
            <span class="em" id="e_gname"></span>
          </div>
          <div class="field">
            <lbl>Guardian Phone<span class="req">*</span></lbl>
            <input id="gphone" name="guardian_phone" inputmode="numeric" maxlength="10" placeholder="10-digit guardian number"/>
            <span class="em" id="e5"></span>
          </div>
          <div class="btns">
            <button type="button" class="btn bo" id="bk2">Back</button>
            <button type="button" class="btn bp" id="b2">Continue <i data-lucide="chevron-right" style="width:16px;height:16px;"></i></button>
          </div>
        </div>

        <!-- STEP 3: Identity & Address -->
        <div class="step" id="p3">
          <div class="field">
            <lbl>ID Proof Type<span class="req">*</span></lbl>
            <select id="id_type" name="id_proof_type">
              <option value="1">Aadhaar Card</option>
              <option value="2">PAN Card</option>
              <option value="3">Voter ID</option>
              <option value="4">Driving License</option>
              <option value="5">Passport</option>
            </select>
          </div>
          <div class="field">
            <lbl>ID Document Number<span class="req">*</span></lbl>
            <input id="aadhaar" name="id_proof_number" inputmode="numeric" maxlength="12" placeholder="e.g. 1234 5678 9012"/>
            <span class="em" id="e6"></span>
          </div>
          
          <div class="field">
            <lbl>ID Photos (Front & Back)</lbl>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:6px;">
              <div class="fw">
                <label class="fb" id="ffb" for="af">
                  <button type="button" class="clear-btn" id="fclear" title="Remove Photo">✕</button>
                  <img id="fprev" class="preview-img" alt="Front Preview"/>
                  <div id="fplaceholder" style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                    <i data-lucide="camera" id="fi" style="width:22px;height:22px;"></i>
                    <span id="ffl">Upload Front</span>
                  </div>
                </label>
                <input type="file" id="af" name="aadhaar_front" accept="image/*"/>
              </div>
              <div class="fw">
                <label class="fb" id="bfb" for="ab">
                  <button type="button" class="clear-btn" id="bclear" title="Remove Photo">✕</button>
                  <img id="bprev" class="preview-img" alt="Back Preview"/>
                  <div id="bplaceholder" style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                    <i data-lucide="camera" id="bi" style="width:22px;height:22px;"></i>
                    <span id="bfl">Upload Back</span>
                  </div>
                </label>
                <input type="file" id="ab" name="aadhaar_back" accept="image/*"/>
              </div>
            </div>
          </div>

          <div class="field" style="margin-top:16px;">
            <lbl>Permanent Address<span class="req">*</span></lbl>
            <textarea id="addr" name="permanent_address" placeholder="Full home / permanent address with pincode"></textarea>
            <span class="em" id="e4"></span>
          </div>

          <div class="field">
            <lbl>Current Location / Present Address</lbl>
            <textarea id="curr_addr" name="present_working_address" placeholder="Workplace / College or current residence address"></textarea>
          </div>

          <div class="btns">
            <button type="button" class="btn bo" id="bk3">Back</button>
            <button type="submit" class="btn bp" id="sub"><i data-lucide="check-circle" style="width:16px;height:16px;"></i> Submit Application</button>
          </div>
        </div>
      </form>
    </div>

    <!-- Success Screen -->
    <div id="ok">
      <div class="ck"><i data-lucide="check-circle-2"></i></div>
      <h2 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;">Application Submitted!</h2>
      <p style="color:#64748B;font-size:14px;line-height:1.5;margin-bottom:24px;">Your registration details have been sent to <strong>${hostelName}</strong>. The management will review and allocate your room shortly.</p>
      <div style="display:flex;justify-content:center;">
        <button class="btn bp" onclick="window.location.reload()" style="max-width:240px;"><i data-lucide="refresh-cw" style="width:16px;height:16px;"></i> Submit Another</button>
      </div>
    </div>
  </div>

  <script>
    lucide.createIcons();
    var cur = 1;
    function go(n) {
      cur = n;
      document.getElementById('prog').style.width = (n===1?0:n===2?50:100)+'%';
      for (var i = 1; i <= 3; i++) {
        var nav=document.getElementById('n'+i), circ=document.getElementById('c'+i);
        nav.className='stp'+(i===n?' active':i<n?' done':'');
        circ.innerHTML = i<n ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : i;
      }
      var steps = document.querySelectorAll('.step');
      for (var j = 0; j < steps.length; j++) {
        steps[j].classList.remove('active');
      }
      document.getElementById('p'+n).classList.add('active');
      try{window.scrollTo({top:0,behavior:'smooth'});}catch(e){window.scrollTo(0,0);}
    }

    function toast(m) {
      var t=document.getElementById('toast');
      document.getElementById('tm').textContent=m;
      t.className='show';
      setTimeout(function(){t.className='';},3500);
    }

    function setErr(id,inp,m){
      var el=document.getElementById(id), i=document.getElementById(inp);
      if(el) el.textContent=m;
      if(i) i.parentElement.className='field'+(m?' ef':'');
    }
    function val(id){ return (document.getElementById(id)||{}).value||''; }

    // Digits only
    var ids = ['phone','gphone'];
    for(var k=0; k<ids.length; k++){
      (function(id){
        var el=document.getElementById(id);
        if(el) el.addEventListener('input',function(e){ e.target.value=e.target.value.replace(/\D/g,''); });
      })(ids[k]);
    }

    // Dynamic ID field handling
    var idt = document.getElementById('id_type');
    var ida = document.getElementById('aadhaar');
    if(idt && ida) {
      idt.addEventListener('change', function(e) {
        var v = e.target.value;
        if(v == '1') {
          ida.setAttribute('maxlength', '12');
          ida.placeholder = 'e.g. 123456789012';
        } else if(v == '2') {
          ida.setAttribute('maxlength', '10');
          ida.placeholder = 'e.g. ABCDE1234F';
        } else if(v == '3') {
          ida.setAttribute('maxlength', '10');
          ida.placeholder = 'e.g. ABC1234567';
        } else if(v == '4') {
          ida.setAttribute('maxlength', '15');
          ida.placeholder = 'e.g. MH1420110062821';
        } else if(v == '5') {
          ida.setAttribute('maxlength', '8');
          ida.placeholder = 'e.g. A1234567';
        }
        ida.value = '';
      });
      ida.addEventListener('input', function(e) {
        if(idt.value == '1') {
          e.target.value = e.target.value.replace(/\D/g,'');
        } else {
          e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g,'').toUpperCase();
        }
      });
    }

    // Live File Upload Previews with Cross Clear Option
    function setupFilePreview(inpId, boxId, prevId, holderId, labelId, clearId, sideText) {
      var inp = document.getElementById(inpId);
      var box = document.getElementById(boxId);
      var prev = document.getElementById(prevId);
      var holder = document.getElementById(holderId);
      var lbl = document.getElementById(labelId);
      var clearBtn = document.getElementById(clearId);
      if (!inp) return;

      inp.addEventListener('change', function() {
        if (inp.files && inp.files[0]) {
          var file = inp.files[0];
          var reader = new FileReader();
          reader.onload = function(e) {
            prev.src = e.target.result;
            prev.style.display = 'block';
            if (holder) holder.style.display = 'none';
            box.className = 'fb has';
            if (lbl) lbl.textContent = 'Change ' + sideText;
            if (clearBtn) clearBtn.style.display = 'flex';
          };
          reader.readAsDataURL(file);
        }
      });

      if (clearBtn) {
        clearBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          inp.value = '';
          prev.src = '';
          prev.style.display = 'none';
          if (holder) holder.style.display = 'flex';
          box.className = 'fb';
          if (lbl) lbl.textContent = 'Upload ' + sideText;
          clearBtn.style.display = 'none';
        });
      }
    }
    setupFilePreview('af', 'ffb', 'fprev', 'fplaceholder', 'ffl', 'fclear', 'Front');
    setupFilePreview('ab', 'bfb', 'bprev', 'bplaceholder', 'bfl', 'bclear', 'Back');

    // Auto-clean phone inputs to only numeric 10 digits
    ['phone', 'gphone'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function() {
          this.value = this.value.replace(/\D/g, '').slice(0, 10);
        });
      }
    });

    // Step 1 Next
    document.getElementById('b1').addEventListener('click', function() {
      var ok = true;
      if (!val('first_name').trim()) { setErr('e1','first_name','First name is required'); ok = false; } else { setErr('e1','first_name',''); }
      var p = val('phone').replace(/\D/g, '').slice(-10);
      if (p.length !== 10 || !/^[6-9]\d{9}$/.test(p)) {
        setErr('e2','phone','Enter a valid 10-digit mobile number starting with 6-9');
        ok = false;
      } else { setErr('e2','phone',''); }
      var em = val('email').trim();
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setErr('e3','email','Enter a valid email'); ok = false; } else { setErr('e3','email',''); }
      if (!val('dob').trim()) { setErr('e_dob','dob','Date of Birth is required'); ok = false; } else { setErr('e_dob','dob',''); }
      if (!val('gender').trim()) { setErr('e_gender','gender','Gender is required'); ok = false; } else { setErr('e_gender','gender',''); }
      if (!ok) { toast('Please fill all required fields correctly.'); return; }
      go(2);
    });

    document.getElementById('bk2').addEventListener('click', function() { go(1); });

    // Step 2 Next (Guardian Phone is mandatory)
    document.getElementById('b2').addEventListener('click', function() {
      var ok = true;
      if (!val('gname').trim()) { setErr('e_gname','gname','Guardian name is required'); ok = false; } else { setErr('e_gname','gname',''); }
      var gp = val('gphone').replace(/\D/g, '').slice(-10);
      if (gp.length !== 10 || !/^[6-9]\d{9}$/.test(gp)) {
        setErr('e5','gphone','Enter a valid 10-digit guardian number starting with 6-9');
        ok = false;
      } else { setErr('e5','gphone',''); }
      if (!ok) { toast('Guardian contact details are required.'); return; }
      go(3);
    });

    document.getElementById('bk3').addEventListener('click', function() { go(2); });

    // Step 3 Submit
    document.getElementById('frm').addEventListener('submit', function(e) {
      e.preventDefault();
      var idnum = val('aadhaar').trim();
      var idtype = val('id_type');
      if (!idnum) { setErr('e6','aadhaar','ID Number is required'); toast('ID document number is required.'); return; }
      if (idtype == '1' && !/^\d{12}$/.test(idnum)) { setErr('e6','aadhaar','Aadhaar must be exactly 12 digits'); toast('Aadhaar must be 12 digits'); return; }
      if (idtype == '2' && !/^[A-Z0-9]{10}$/.test(idnum)) { setErr('e6','aadhaar','PAN must be exactly 10 characters'); toast('PAN must be 10 characters'); return; }
      if (idtype == '3' && !/^[A-Z0-9]{10}$/.test(idnum)) { setErr('e6','aadhaar','Voter ID must be exactly 10 characters'); toast('Voter ID must be 10 characters'); return; }
      if (idtype == '4' && !/^[A-Z0-9]{15}$/.test(idnum)) { setErr('e6','aadhaar','Driving License must be exactly 15 characters'); toast('Driving License must be 15 characters'); return; }
      if (idtype == '5' && !/^[A-Z0-9]{8}$/.test(idnum)) { setErr('e6','aadhaar','Passport must be exactly 8 characters'); toast('Passport must be 8 characters'); return; }
      setErr('e6','aadhaar','');

      if (!val('addr').trim()) { setErr('e4','addr','Permanent address is required'); toast('Permanent address is required.'); return; } else { setErr('e4','addr',''); }

      document.getElementById('ldr').className = 'show';
      var d = new FormData(this);

      fetch('${postUrl}', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: d
      })
        .then(function(r) {
          return r.json().catch(function() {
            return { success: false, error: 'Server error during submission. Please try again.' };
          });
        })
        .then(function(res) {
          document.getElementById('ldr').className = '';
          if (res.success) {
            document.getElementById('fc').style.display = 'none';
            document.getElementById('ok').style.display = 'block';
            lucide.createIcons();
          } else {
            toast(res.error || 'Submission failed. Please check your details.');
          }
        })
        .catch(function(err) {
          document.getElementById('ldr').className = '';
          toast('Network or connection issue. Please check your internet and retry.');
        });
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.status(200).send(html);
});

const qrSignupErrorPage = (message: string) =>
  `<div style="background:#fef2f2;color:#7f1d1d;padding:14px;border-radius:10px;font-family:sans-serif;">⚠️ ${message}</div>`;

app.post('/api/public/qr-signup', qrSignupUpload.fields([
  { name: 'aadhaar_front', maxCount: 1 },
  { name: 'aadhaar_back', maxCount: 1 },
]), async (req, res) => {
  try {
    const hostelId = req.query.hostelId as string;
    const roomId   = req.query.roomId   as string | undefined;
    const bedId    = req.query.bedId    as string | undefined;
    const bedName  = req.query.bedName  as string | undefined;

    const wantsJson = req.headers.accept?.includes('application/json') || req.xhr;
    const sendError = (msg: string) => wantsJson ? res.status(400).json({ success: false, error: msg }) : res.status(400).send(qrSignupErrorPage(msg));

    if (!hostelId) {
      return sendError('Missing hostel ID');
    }
    const {
      first_name, last_name, phone, email,
      date_of_birth, gender, permanent_address, present_working_address,
      guardian_name, guardian_phone, id_proof_number, id_proof_type
    } = req.body || {};

    const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
    const aadhaarFrontFile = files?.aadhaar_front?.[0];
    const aadhaarBackFile  = files?.aadhaar_back?.[0];

    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const cleanGuardianPhone = String(guardian_phone || '').replace(/\D/g, '').slice(-10);

    if (!first_name || !String(first_name).trim()) return sendError('First Name is required');
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) return sendError('A valid 10-digit Phone number starting with 6-9 is required');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) return sendError('Enter a valid email address');
    if (!guardian_name || !String(guardian_name).trim()) return sendError('Guardian Name is required');
    if (!cleanGuardianPhone || cleanGuardianPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanGuardianPhone)) return sendError('A valid 10-digit Guardian Phone number starting with 6-9 is required');
    if (!permanent_address || !String(permanent_address).trim()) return sendError('Permanent Address is required');
    if (!id_proof_number || !String(id_proof_number).trim()) return sendError('ID Number is required');
    
    const typeId = parseInt(id_proof_type, 10) || 1;
    const cleanId = String(id_proof_number).trim().toUpperCase();
    if (typeId === 1 && !/^\d{12}$/.test(cleanId)) return sendError('Aadhaar Number must be exactly 12 digits');
    if (typeId === 2 && !/^[A-Z0-9]{10}$/.test(cleanId)) return sendError('PAN must be exactly 10 characters');
    if (typeId === 3 && !/^[A-Z0-9]{10}$/.test(cleanId)) return sendError('Voter ID must be exactly 10 characters');
    if (typeId === 4 && !/^[A-Z0-9]{15}$/.test(cleanId)) return sendError('Driving License must be exactly 15 characters');
    if (typeId === 5 && !/^[A-Z0-9]{8}$/.test(cleanId)) return sendError('Passport must be exactly 8 characters');

    const numHostelId = parseInt(hostelId, 10);
    if (isNaN(numHostelId)) return sendError('Invalid hostel link');

    const hostelExists = await db('hostel_master').where('hostel_id', numHostelId).first();
    if (!hostelExists) return sendError('This hostel link is no longer valid');

    const uniqueness = await checkHostelUniqueIdentifiers(numHostelId, {
      phone: cleanPhone,
      email: email ? String(email).trim() : null,
      id_number: cleanId,
    });
    if (!uniqueness.isUnique) {
      if (uniqueness.conflictField === 'phone') return sendError('This phone number is already registered in this hostel.');
      if (uniqueness.conflictField === 'email') return sendError('This email address is already registered in this hostel.');
      return sendError('This ID proof number is already registered in this hostel.');
    }

    let parsedDob: string | null = null;
    if (date_of_birth) {
      try {
        parsedDob = new Date(date_of_birth).toISOString().split('T')[0];
      } catch (e) {
        parsedDob = String(date_of_birth);
      }
    }

    let frontUrl: string | null = aadhaarFrontFile ? `/uploads/${aadhaarFrontFile.filename}` : null;
    let backUrl: string | null = aadhaarBackFile ? `/uploads/${aadhaarBackFile.filename}` : null;

    if (aadhaarFrontFile) {
      try {
        const uploaded = await processFileUpload(aadhaarFrontFile, 'students');
        if (uploaded) frontUrl = uploaded;
      } catch (e) {}
    }
    if (aadhaarBackFile) {
      try {
        const uploaded = await processFileUpload(aadhaarBackFile, 'students');
        if (uploaded) backUrl = uploaded;
      } catch (e) {}
    }

    const nowStr = new Date().toISOString().split('T')[0];
    const insertData: any = {
      hostel_id:        numHostelId,
      first_name:       String(first_name).trim(),
      last_name:        last_name ? String(last_name).trim() : null,
      phone:            cleanPhone,
      email:            email ? String(email).trim() : null,
      date_of_birth:    parsedDob,
      gender:           String(gender).trim(),
      permanent_address: permanent_address ? String(permanent_address).trim() : null,
      present_working_address: present_working_address ? String(present_working_address).trim() : null,
      guardian_name:    guardian_name ? String(guardian_name).trim() : null,
      guardian_phone:   cleanGuardianPhone,
      admission_date:   nowStr,
      admission_fee:    0,
      admission_status: 0,
      status:           3, // QR Signup — owner must activate
      room_id:          roomId ? parseInt(roomId, 10) : null,
      bed_id:           bedId || null,
      floor_number:     null,
      monthly_rent:     null,
      id_proof_type:    typeId,
      id_proof_number:  cleanId,
      id_proof_status:  1, // Submitted
      id_proof_front_url: frontUrl,
      id_proof_back_url:  backUrl,
    };

    let newStudentId: number;
    try {
      const [id] = await db('students').insert(insertData);
      newStudentId = id;
    } catch (insertErr: any) {
      console.warn('[qr-signup] Initial insert error, retrying without optional columns:', insertErr.message);
      delete insertData.id_proof_front_url;
      delete insertData.id_proof_back_url;
      delete insertData.id_proof_status;
      const [id] = await db('students').insert(insertData);
      newStudentId = id;
    }

    // Notify the owner of the hostel
    sendNotificationToHostelOwner(
      numHostelId,
      'New Admission',
      'New Registration Request',
      `${first_name} has submitted a registration request via QR. Review and assign a room.`,
      'High',
      { studentId: newStudentId }
    ).catch(err => console.error('[qr-signup] Owner notification error:', err));

    if (wantsJson) {
      return res.status(200).json({ success: true, message: 'Registration submitted successfully!' });
    }

    const successHtml = `
      <!DOCTYPE html>
      <html><body><h2>Success!</h2></body></html>
    `;
    res.status(200).send(successHtml);
  } catch (error: any) {
    console.error('QR Signup POST Error:', error);
    const wantsJson = req.headers.accept?.includes('application/json') || req.xhr;
    if (wantsJson) {
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    } else {
      res.status(500).send(qrSignupErrorPage(error.message || 'Internal server error'));
    }
  }
});

app.use('/api/public/qr-signup', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!err) return next();
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'Each ID photo must be under 5MB' : (err.message || 'Upload failed. Please try again.');
  const wantsJson = req.headers.accept?.includes('application/json') || req.xhr;
  if (wantsJson) {
    return res.status(400).json({ success: false, error: message });
  }
  res.status(400).send(qrSignupErrorPage(message));
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// NOTE: /api/health-db was removed — it exposed SHOW TABLES + DESCRIBE to
// unauthenticated callers, leaking the full DB schema. Use the /health
// liveness endpoint below for uptime checks.


// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Hostix API',
    version: '1.0.0',
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`[404] No route found for ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
httpServer.listen(PORT, HOST, () => {
  const serverAddress = NODE_ENV === 'production'
    ? `Port ${PORT}`
    : `http://localhost:${PORT}`;

  console.log(`ðŸš€ Server running on ${serverAddress}`);
  console.log(`ðŸ” Environment: ${NODE_ENV}`);
  console.log(`ðŸ“ Listening on ${HOST}:${PORT}`);

  // Cron jobs are started once, at module load (see top of file) — not here.


  console.log('â° Cron jobs initialized (registered once at module load)');
});

export default app;

