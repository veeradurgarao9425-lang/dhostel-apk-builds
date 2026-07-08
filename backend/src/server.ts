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

// Public QR tenant signup (no auth) — redirect to React frontend
app.get('/api/public/qr-signup', (req, res) => {
  const hostelId = req.query.hostelId as string;
  const roomId   = req.query.roomId   as string | undefined;
  const bedId    = req.query.bedId    as string | undefined;
  const bedName  = req.query.bedName  as string | undefined;

  if (!hostelId) {
    return res.status(400).send('<h2 style="font-family:sans-serif;color:#7f1d1d;">Missing hostelId</h2>');
  }

  // Build query string for React page
  let qs = `hostelId=${encodeURIComponent(hostelId)}`;
  if (roomId)  qs += `&roomId=${encodeURIComponent(roomId)}`;
  if (bedId)   qs += `&bedId=${encodeURIComponent(bedId)}`;
  if (bedName) qs += `&bedName=${encodeURIComponent(bedName)}`;

  // Redirect to React frontend page
  const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
  return res.redirect(`${frontendOrigin}/register?${qs}`);
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

    const wantsJson = req.headers.accept?.includes('application/json');
    const sendError = (msg: string) => wantsJson ? res.status(400).json({ success: false, error: msg }) : res.status(400).send(qrSignupErrorPage(msg));

    if (!hostelId) {
      return sendError('Missing hostelId');
    }
    const {
      first_name, last_name, phone, email,
      date_of_birth, gender, permanent_address,
      guardian_name, guardian_phone, id_proof_number,
    } = req.body || {};

    const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
    const aadhaarFrontFile = files?.aadhaar_front?.[0];
    const aadhaarBackFile  = files?.aadhaar_back?.[0];

    if (!first_name || !String(first_name).trim()) return sendError('First Name is required');
    if (!phone || !/^\d{10}$/.test(String(phone).trim())) return sendError('A valid 10-digit Phone number is required');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) return sendError('Enter a valid email address');
    if (guardian_phone && !/^\d{10}$/.test(String(guardian_phone).trim())) return sendError('Guardian Phone must be a valid 10-digit number');
    if (!permanent_address || !String(permanent_address).trim()) return sendError('Permanent Address is required');
    if (!id_proof_number || !/^\d{12}$/.test(String(id_proof_number).trim())) return sendError('Aadhaar Number must be exactly 12 digits');

    const numHostelId = parseInt(hostelId, 10);
    if (isNaN(numHostelId)) return sendError('Invalid hostel link');

    const hostelExists = await db('hostel_master').where('hostel_id', numHostelId).first();
    if (!hostelExists) return sendError('This hostel link is no longer valid');

    const existingAadhaar = await db('students').where({ hostel_id: numHostelId, id_proof_number: String(id_proof_number).trim() }).first();
    if (existingAadhaar) return sendError('This Aadhaar number is already registered in this hostel.');

    const now = new Date();
    const insertData: any = {
      hostel_id:        numHostelId,
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
      id_proof_number:    String(id_proof_number).trim(),
      id_proof_front_url: aadhaarFrontFile ? `/uploads/${aadhaarFrontFile.filename}` : null,
      id_proof_back_url:  aadhaarBackFile ? `/uploads/${aadhaarBackFile.filename}` : null,
      id_proof_status:  1, // Submitted
    };

    const [newStudentId] = await db('students').insert(insertData);

    // Notify the owner of the hostel
    sendNotificationToHostelOwner(
      numHostelId,
      'New Admission',
      'New Registration Request',
      `${first_name} has submitted a registration request via QR. Review and assign a room.`,
      'High',
      { studentId: newStudentId }
    );

    if (wantsJson) {
      return res.status(200).json({ success: true, message: 'Registration submitted successfully!' });
    }

    const successHtml = `
      <!DOCTYPE html>
      <html><body><h2>Success!</h2></body></html>
    `;
    res.status(200).send(successHtml);
  } catch (error) {
    console.error('QR Signup POST Error:', error);
    const wantsJson = req.headers.accept?.includes('application/json');
    if (wantsJson) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    } else {
      res.status(500).send(qrSignupErrorPage('Internal server error'));
    }
  }
});

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
