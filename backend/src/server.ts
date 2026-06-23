import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import db from './config/database.js';
import hostelRoutes from './routes/hostel.routes.js';
import userRoutes from './routes/user.routes.js';
import roomRoutes from './routes/roomRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
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
import { startMonthlyFeesGenerationJob } from './jobs/monthlyFeesGeneration.js';
import { startGuestOverstayJob } from './jobs/guestOverstay.js';
import { sendNotificationToHostelOwner } from './utils/notification.js';

// Load environment variables
dotenv.config();

const app = express();
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
app.use('/api/fees', feeRoutes);
app.use('/api/monthly-fees', monthlyFeeRoutes);
app.use('/api/month-fees', monthlyFeeRoutes); // Alias for common typo
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/analytics', reportRoutes); // Keep this as well for mobile compatibility
app.use('/api/activity', activityRoutes);
app.use('/api/amenities', amenitiesRoutes);
app.use('/api/relations', relationsRoutes);
app.use('/api/id-proof-types', idProofTypesRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/notifications', notificationRoutes);

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
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo"><div class="logo-icon">🏠</div></div>
        <h2>Tenant Registration</h2>
        <p class="subtitle">Fill in your details below. The owner will review and activate your profile.</p>

        ${roomBanner}

        <form method="POST" action="${formAction}">
          <div class="section">Personal Details</div>
          <div class="row">
            <div class="field"><label>First Name *</label><input name="first_name" required placeholder="e.g. Ravi" /></div>
            <div class="field"><label>Last Name</label><input name="last_name" placeholder="e.g. Kumar" /></div>
          </div>
          <div class="row">
            <div class="field"><label>Phone *</label><input name="phone" pattern="\\d{10}" required placeholder="10-digit mobile" /></div>
            <div class="field"><label>Email</label><input name="email" type="email" placeholder="your@email.com" /></div>
          </div>
          <div class="row">
            <div class="field"><label>Date of Birth</label><input name="date_of_birth" type="date" /></div>
            <div class="field">
              <label>Gender</label>
              <select name="gender">
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div class="field"><label>Permanent Address</label><input name="permanent_address" placeholder="Your home address" /></div>

          <div class="section">Guardian (Optional)</div>
          <div class="row">
            <div class="field"><label>Guardian Name</label><input name="guardian_name" placeholder="Parent/Guardian name" /></div>
            <div class="field"><label>Guardian Phone</label><input name="guardian_phone" pattern="\\d{10}" placeholder="10-digit number" /></div>
          </div>

          <button class="btn" type="submit">✓ Submit Registration</button>
          <p class="note">Your details are safe. Once the owner approves, you will be activated in the system.</p>
        </form>
      </div>
    </body>
    </html>
  `;
  res.status(200).send(html);
});

app.post('/api/public/qr-signup', async (req, res) => {
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
      guardian_name, guardian_phone
    } = req.body || {};

    if (!first_name || !phone) {
      return res.status(400).send('<div style="background:#fef2f2;color:#7f1d1d;padding:14px;border-radius:10px;font-family:sans-serif;">⚠️ First Name and Phone are required</div>');
    }

    const numHostelId = parseInt(hostelId, 10);
    if (isNaN(numHostelId)) {
      return res.status(400).send('<div style="background:#fef2f2;color:#7f1d1d;padding:14px;border-radius:10px;font-family:sans-serif;">⚠️ Invalid hostel link</div>');
    }
    const hostelExists = await db('hostel_master').where('hostel_id', numHostelId).first();
    if (!hostelExists) {
      return res.status(404).send('<div style="background:#fef2f2;color:#7f1d1d;padding:14px;border-radius:10px;font-family:sans-serif;">⚠️ This hostel link is no longer valid</div>');
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
      id_proof_status:  0,
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
    message: 'Stivo API',
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
app.listen(PORT, HOST, () => {
  const serverAddress = NODE_ENV === 'production'
    ? `Port ${PORT}`
    : `http://localhost:${PORT}`;

  console.log(`🚀 Server running on ${serverAddress}`);
  console.log(`🔐 Environment: ${NODE_ENV}`);
  console.log(`📍 Listening on ${HOST}:${PORT}`);

  // Start cron jobs
  startMonthlyFeesGenerationJob();
  startGuestOverstayJob();
  console.log(`⏰ Cron jobs initialized`);
});

export default app;
