import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
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
import messSkipRoutes from './routes/messSkipRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import { startMonthlyFeesGenerationJob } from './jobs/monthlyFeesGeneration.js';
import { startGuestOverstayJob } from './jobs/guestOverstay.js';
import { startChatResetJob } from './jobs/chatReset.js';

import { sendNotificationToHostelOwner } from './utils/notification.js';

// Load environment variables
dotenv.config();

const app = express();
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
    'http://localhost:5175',
    'https://dhostel-frontend.onrender.com' // Example production domain
  ];
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
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
app.use('/api/mess', messSkipRoutes);
app.use('/api/ratings', ratingRoutes);

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
});

// Public QR tenant signup (no auth) — supports optional roomId & bedId pre-fill
app.get('/api/public/qr-signup', async (req, res) => {
  const hostelId = req.query.hostelId as string;
  const roomId   = req.query.roomId   as string | undefined;
  const bedId    = req.query.bedId    as string | undefined;
  const bedName  = req.query.bedName  as string | undefined;

  if (!hostelId) {
    return res.status(400).send('<h2>Missing hostelId</h2>');
  }

  // Build the room/bed info banner if pre-assigned
  const roomBanner = roomId ? `
    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:14px;margin-bottom:18px;">
      <div style="font-size:13px;color:#166534;font-weight:700;margin-bottom:4px;">🏠 Pre-assigned Allocation</div>
      <div style="font-size:14px;color:#15803d;">
        Room: <strong>${roomId}</strong>${bedName ? `&nbsp;&nbsp;Bed: <strong>${bedName}</strong>` : ''}
      </div>
      <div style="font-size:12px;color:#4ade80;margin-top:4px;">This room/bed has been reserved for you by the owner.</div>
    </div>
  ` : '';

  const formAction = `/api/public/qr-signup?hostelId=${encodeURIComponent(hostelId)}${roomId ? `&roomId=${encodeURIComponent(roomId)}` : ''}${bedId ? `&bedId=${encodeURIComponent(bedId)}` : ''}${bedName ? `&bedName=${encodeURIComponent(bedName)}` : ''}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Tenant Registration — Hostel</title>
      <style>
        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg,#F5F3FF 0%,#EDE9FE 100%); margin:0; min-height:100vh; padding:20px 16px 40px; }
        .card { max-width:520px; margin:0 auto; background:#fff; border-radius:20px; padding:28px 24px; box-shadow:0 8px 32px rgba(124,58,237,0.12); }
        .logo { text-align:center; margin-bottom:20px; }
        .logo-icon { width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#7C3AED,#5F2EEA);display:inline-flex;align-items:center;justify-content:center;font-size:28px; }
        h2 { margin:0 0 4px;color:#111827;font-size:22px;font-weight:700; }
        .subtitle { color:#6b7280;font-size:13px;margin-bottom:20px; }
        .section { font-weight:700;color:#374151;font-size:13px;letter-spacing:.5px;text-transform:uppercase;margin:18px 0 10px; }
        .field { margin-bottom:14px; }
        label { display:block;font-size:13px;color:#374151;margin-bottom:6px;font-weight:600; }
        input, select { width:100%;padding:12px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;color:#111827;outline:none;transition:border-color .2s; }
        input:focus, select:focus { border-color:#7C3AED; }
        .row { display:flex;gap:12px; }
        .row .field { flex:1; }
        .btn { width:100%;background:linear-gradient(135deg,#7C3AED,#5F2EEA);color:#fff;border:none;padding:15px;border-radius:12px;font-weight:700;font-size:16px;cursor:pointer;margin-top:8px;letter-spacing:.3px; }
        .btn:hover { opacity:.92; }
        .note { font-size:12px;color:#9ca3af;margin-top:14px;text-align:center; }
        .success { background:#ecfdf5;color:#065f46;padding:14px;border-radius:10px;margin-bottom:14px;font-weight:600; }
        .error   { background:#fef2f2;color:#7f1d1d;padding:14px;border-radius:10px;margin-bottom:14px; }
        .field input.invalid, .field select.invalid { border-color:#dc2626; }
        .err-msg { display:block; color:#dc2626; font-size:12px; margin-top:4px; min-height:14px; }
        .file-field input[type="file"] { position:absolute; width:1px; height:1px; opacity:0; overflow:hidden; }
        .file-btn { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:14px; border:1.5px dashed #c4b5fd; border-radius:10px; background:#faf5ff; color:#7c3aed; font-size:13px; font-weight:600; cursor:pointer; text-align:center; }
        .file-btn.has-file { border-style:solid; border-color:#7C3AED; background:#f5f3ff; }
        .btn[disabled] { opacity:.6; cursor:not-allowed; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo"><div class="logo-icon">🏠</div></div>
        <h2>Tenant Registration</h2>
        <p class="subtitle">Fill in your details below. The owner will review and activate your profile.</p>

        ${roomBanner}

        <form id="signupForm" method="POST" action="${formAction}" enctype="multipart/form-data" novalidate>
          <div class="section">Personal Details</div>
          <div class="row">
            <div class="field">
              <label>First Name *</label>
              <input name="first_name" id="first_name" required placeholder="e.g. Ravi" />
              <span class="err-msg" id="err-first_name"></span>
            </div>
            <div class="field">
              <label>Last Name</label>
              <input name="last_name" id="last_name" placeholder="e.g. Kumar" />
              <span class="err-msg" id="err-last_name"></span>
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>Phone *</label>
              <input name="phone" id="phone" inputmode="numeric" maxlength="10" required placeholder="10-digit mobile" />
              <span class="err-msg" id="err-phone"></span>
            </div>
            <div class="field">
              <label>Email</label>
              <input name="email" id="email" type="email" placeholder="your@email.com" />
              <span class="err-msg" id="err-email"></span>
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>Date of Birth</label>
              <input name="date_of_birth" id="date_of_birth" type="date" />
              <span class="err-msg" id="err-date_of_birth"></span>
            </div>
            <div class="field">
              <label>Gender</label>
              <select name="gender" id="gender">
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <span class="err-msg" id="err-gender"></span>
            </div>
          </div>
          <div class="field">
            <label>Permanent Address *</label>
            <input name="permanent_address" id="permanent_address" required placeholder="Your home address" />
            <span class="err-msg" id="err-permanent_address"></span>
          </div>

          <div class="section">Guardian (Optional)</div>
          <div class="row">
            <div class="field">
              <label>Guardian Name</label>
              <input name="guardian_name" id="guardian_name" placeholder="Parent/Guardian name" />
              <span class="err-msg" id="err-guardian_name"></span>
            </div>
            <div class="field">
              <label>Guardian Phone</label>
              <input name="guardian_phone" id="guardian_phone" inputmode="numeric" maxlength="10" placeholder="10-digit number" />
              <span class="err-msg" id="err-guardian_phone"></span>
            </div>
          </div>

          <div class="section">Identity Verification (Aadhaar)</div>
          <div class="field">
            <label>Aadhaar Number *</label>
            <input name="id_proof_number" id="id_proof_number" inputmode="numeric" maxlength="12" required placeholder="12-digit Aadhaar number" />
            <span class="err-msg" id="err-id_proof_number"></span>
          </div>
          <div class="row">
            <div class="field file-field">
              <label>Aadhaar Front Photo *</label>
              <label class="file-btn" id="btn-aadhaar_front" for="aadhaar_front"><span id="label-aadhaar_front">📷 Upload front photo</span></label>
              <input type="file" name="aadhaar_front" id="aadhaar_front" accept="image/*" capture="environment" required />
              <span class="err-msg" id="err-aadhaar_front"></span>
            </div>
            <div class="field file-field">
              <label>Aadhaar Back Photo *</label>
              <label class="file-btn" id="btn-aadhaar_back" for="aadhaar_back"><span id="label-aadhaar_back">📷 Upload back photo</span></label>
              <input type="file" name="aadhaar_back" id="aadhaar_back" accept="image/*" capture="environment" required />
              <span class="err-msg" id="err-aadhaar_back"></span>
            </div>
          </div>

          <button class="btn" id="submitBtn" type="submit">✓ Submit Registration</button>
          <p class="note">Your details are safe. Once the owner approves, you will be activated in the system.</p>
        </form>
      </div>
      <script>
        (function () {
          var form = document.getElementById('signupForm');
          var submitBtn = document.getElementById('submitBtn');

          function showError(name, msg) {
            var el = document.getElementById('err-' + name);
            var input = document.getElementById(name);
            if (el) el.textContent = msg || '';
            if (input) input.classList.toggle('invalid', !!msg);
          }

          function isValidEmail(v) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
          }

          function validate() {
            var ok = true;

            if (!form.first_name.value.trim()) { showError('first_name', 'First name is required'); ok = false; }
            else { showError('first_name', ''); }

            var phone = form.phone.value.trim();
            if (!/^\d{10}$/.test(phone)) { showError('phone', 'Enter a valid 10-digit mobile number'); ok = false; }
            else { showError('phone', ''); }

            var email = form.email.value.trim();
            if (email && !isValidEmail(email)) { showError('email', 'Enter a valid email address'); ok = false; }
            else { showError('email', ''); }

            var dob = form.date_of_birth.value;
            if (dob && new Date(dob).getTime() > Date.now()) { showError('date_of_birth', 'Date of birth cannot be in the future'); ok = false; }
            else { showError('date_of_birth', ''); }

            if (!form.permanent_address.value.trim()) { showError('permanent_address', 'Permanent address is required'); ok = false; }
            else { showError('permanent_address', ''); }

            var gphone = form.guardian_phone.value.trim();
            if (gphone && !/^\d{10}$/.test(gphone)) { showError('guardian_phone', 'Enter a valid 10-digit number'); ok = false; }
            else { showError('guardian_phone', ''); }

            var aadhaar = form.id_proof_number.value.trim();
            if (!/^\d{12}$/.test(aadhaar)) { showError('id_proof_number', 'Aadhaar number must be exactly 12 digits'); ok = false; }
            else { showError('id_proof_number', ''); }

            if (!form.aadhaar_front.files || form.aadhaar_front.files.length === 0) { showError('aadhaar_front', 'Please upload the front photo of your Aadhaar card'); ok = false; }
            else { showError('aadhaar_front', ''); }

            if (!form.aadhaar_back.files || form.aadhaar_back.files.length === 0) { showError('aadhaar_back', 'Please upload the back photo of your Aadhaar card'); ok = false; }
            else { showError('aadhaar_back', ''); }

            return ok;
          }

          ['aadhaar_front', 'aadhaar_back'].forEach(function (name) {
            var input = document.getElementById(name);
            var btn = document.getElementById('btn-' + name);
            var label = document.getElementById('label-' + name);
            input.addEventListener('change', function () {
              var hasFile = input.files && input.files.length > 0;
              btn.classList.toggle('has-file', hasFile);
              label.textContent = hasFile ? ('✓ ' + input.files[0].name) : ('📷 Upload ' + (name === 'aadhaar_front' ? 'front' : 'back') + ' photo');
              showError(name, '');
            });
          });

          form.addEventListener('submit', function (e) {
            if (!validate()) {
              e.preventDefault();
              var firstInvalid = form.querySelector('.invalid, .file-btn + .err-msg:not(:empty)');
              if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return;
            }
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
          });
        })();
      </script>
    </body>
    </html>
  `;
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

    if (!hostelId) {
      return res.status(400).send('<div class="error">Missing hostelId</div>');
    }
    const {
      first_name, last_name, phone, email,
      date_of_birth, gender, permanent_address,
      guardian_name, guardian_phone, id_proof_number,
    } = req.body || {};

    const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
    const aadhaarFrontFile = files?.aadhaar_front?.[0];
    const aadhaarBackFile  = files?.aadhaar_back?.[0];

    if (!first_name || !String(first_name).trim()) {
      return res.status(400).send(qrSignupErrorPage('First Name is required'));
    }
    if (!phone || !/^\d{10}$/.test(String(phone).trim())) {
      return res.status(400).send(qrSignupErrorPage('A valid 10-digit Phone number is required'));
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).send(qrSignupErrorPage('Enter a valid email address'));
    }
    if (guardian_phone && !/^\d{10}$/.test(String(guardian_phone).trim())) {
      return res.status(400).send(qrSignupErrorPage('Guardian Phone must be a valid 10-digit number'));
    }
    if (!permanent_address || !String(permanent_address).trim()) {
      return res.status(400).send(qrSignupErrorPage('Permanent Address is required'));
    }
    if (!id_proof_number || !/^\d{12}$/.test(String(id_proof_number).trim())) {
      return res.status(400).send(qrSignupErrorPage('Aadhaar Number must be exactly 12 digits'));
    }
    if (!aadhaarFrontFile || !aadhaarBackFile) {
      return res.status(400).send(qrSignupErrorPage('Both Aadhaar front and back photos are required'));
    }

    const numHostelId = parseInt(hostelId, 10);
    if (isNaN(numHostelId)) {
      return res.status(400).send(qrSignupErrorPage('Invalid hostel link'));
    }
    const hostelExists = await db('hostel_master').where('hostel_id', numHostelId).first();
    if (!hostelExists) {
      return res.status(404).send(qrSignupErrorPage('This hostel link is no longer valid'));
    }

    const now = new Date();
    const insertData: any = {
      hostel_id:        parseInt(hostelId, 10),
      first_name,
      last_name:        last_name || null,
      phone,
      email:            email || null,
      date_of_birth:    date_of_birth ? new Date(date_of_birth) : null,
      gender:           gender || null,
      permanent_address: permanent_address || null,
      guardian_name:    guardian_name || null,
      guardian_phone:   guardian_phone || null,
      admission_date:   now,
      admission_fee:    0,
      admission_status: 0,
      status:           3, // QR Signup — owner must activate
      room_id:          roomId ? parseInt(roomId, 10) : null,
      floor_number:     null,
      monthly_rent:     null,
      id_proof_type:      'Aadhaar',
      id_proof_number:    id_proof_number.trim(),
      id_proof_front_url: `/uploads/${aadhaarFrontFile.filename}`,
      id_proof_back_url:  `/uploads/${aadhaarBackFile.filename}`,
      id_proof_status:  1, // Submitted — owner still verifies before activation
    };

    const [newStudentId] = await db('students').insert(insertData);

    // Notify the owner of the hostel
    sendNotificationToHostelOwner(
      numHostelId,
      'New Admission',
      'New Tenant Request (QR)',
      `New QR signup registration submitted by ${first_name} ${last_name || ''}.`,
      'High',
      { id: newStudentId }
    ).catch(err => console.error('Failed to send QR signup notification:', err));

    const backUrl = `/api/public/qr-signup?hostelId=${encodeURIComponent(hostelId)}${roomId ? `&roomId=${encodeURIComponent(roomId)}` : ''}${bedId ? `&bedId=${encodeURIComponent(bedId)}` : ''}${bedName ? `&bedName=${encodeURIComponent(bedName)}` : ''}`;
    res.status(200).send(`
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" />
      <style>body{font-family:sans-serif;background:linear-gradient(135deg,#F5F3FF,#EDE9FE);display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}.card{background:#fff;border-radius:20px;padding:32px 28px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(124,58,237,.12);text-align:center;}</style>
      </head><body>
      <div class="card">
        <div style="font-size:56px;margin-bottom:16px;">✅</div>
        <h2 style="color:#065f46;margin:0 0 8px;">Registration Submitted!</h2>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">Thank you, <strong>${first_name}</strong>! Your details have been received. The hostel owner will review and activate your profile shortly.</p>
        ${roomId ? `<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:12px;margin-bottom:20px;"><p style="margin:0;color:#166534;font-size:14px;">🏠 Room <strong>${roomId}</strong>${bedName ? ` — Bed <strong>${bedName}</strong>` : ''} has been noted.</p></div>` : ''}
        <a href="${backUrl}" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#5F2EEA);color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;">Register Another</a>
      </div></body></html>
    `);
  } catch (e: any) {
    console.error('QR signup error:', e);
    res.status(500).send('<div style="font-family:sans-serif;padding:20px;color:#7f1d1d;">Internal Server Error. Please try again.</div>');
  }
});

// Aadhaar upload errors (oversized/invalid file) surface as HTML, not JSON, on this public form route
app.use('/api/public/qr-signup', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!err) return next();
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'Each Aadhaar photo must be under 5MB' : (err.message || 'Upload failed. Please try again.');
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

// Database health check (public for diagnostics)
app.get('/api/health-db', async (req, res) => {
  try {
    const tables = await db.raw("SHOW TABLES");
    let feePaymentsColumns = [];
    try {
      feePaymentsColumns = await db.raw("DESCRIBE fee_payments");
    } catch (e: any) {
      feePaymentsColumns = [{ error: e.message }];
    }
    res.json({
      success: true,
      tables: tables[0],
      fee_payments: feePaymentsColumns[0]
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


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

  console.log(`🚀 Server running on ${serverAddress}`);
  console.log(`🔐 Environment: ${NODE_ENV}`);
  console.log(`📍 Listening on ${HOST}:${PORT}`);

  // Start Background Cron Jobs
  startMonthlyFeesGenerationJob();
  startGuestOverstayJob();
  startChatResetJob();


  console.log('⏰ Cron jobs initialized');
});

export default app;
