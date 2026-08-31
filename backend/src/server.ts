// QR Signup: v3 — React-based public registration form (register-web/dist)
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
import { fileURLToPath } from 'url';
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
import feedbackRoutes from './routes/feedbackRoutes.js';
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
import { startDatabaseBackupJob } from './jobs/databaseBackup.js';
import { sendNotificationToHostelOwner } from './utils/notification.js';
import { checkHostelUniqueIdentifiers } from './utils/validation.js';
import { processFileUpload } from './utils/fileUpload.js';
import { sanitizeInputMiddleware, developerLoginLimiter } from './middleware/security.js';
import { publicGuestSignup } from './controllers/guestController.js';
import bcrypt from 'bcryptjs';


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
startDatabaseBackupJob();

// Auto-ensure demo@test.com exists so Play Store demo login always works
(async () => {
  try {
    const existingDemo = await db('users').where({ email: 'demo@test.com' }).first().catch(() => null);
    if (!existingDemo) {
      const hashedPassword = await bcrypt.hash('Demo123', 10);

      // Get or create a demo hostel
      let hostelId: number;
      const existingHostel = await db('hostel_master').first().catch(() => null);
      if (existingHostel) {
        hostelId = existingHostel.hostel_id;
      } else {
        const [newHostelId] = await db('hostel_master').insert({
          hostel_name: 'Hostix Demo Hostel',
          address: 'Plot 42, Silicon Valley Road, Madhapur',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500081',
          contact_number: '9876543210',
          total_floors: 4,
          admission_fee: 1000.00,
          hostel_code: 'DEMO01',
          is_active: 1,
        });
        hostelId = newHostelId;
      }

      const [userId] = await db('users').insert({
        full_name: 'Hostix Demo Owner',
        email: 'demo@test.com',
        username: 'demo',
        phone: '9876543210',
        password: hashedPassword,
        password_hash: hashedPassword,
        role: 'OWNER',
        role_id: 2,
        hostel_id: hostelId,
        is_active: 1,
      });

      await db('hostel_master').where({ hostel_id: hostelId }).update({ owner_id: userId }).catch(() => {});
      console.log('✅ [Demo] Created demo@test.com / Demo123 (userId:', userId, ', hostelId:', hostelId, ')');
    } else {
      // Ensure password is always Demo123 (in case it was changed)
      const hashedPassword = await bcrypt.hash('Demo123', 10);
      await db('users').where({ email: 'demo@test.com' }).update({
        password: hashedPassword,
        password_hash: hashedPassword,
        is_active: 1,
      }).catch(() => {});
      console.log('✅ [Demo] demo@test.com already exists, password reset to Demo123');
    }
  } catch (demoErr: any) {
    console.warn('[Demo] Could not ensure demo user:', demoErr?.message || demoErr);
  }
})();


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
      defaultSrc: ["'self'", "'unsafe-inline'", "https:", "http:", "data:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.cdnfonts.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.cdnfonts.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      connectSrc: ["'self'", "*", "data:", "blob:", ...getAllowedOrigins()],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: null
    },
  },
  crossOriginEmbedderPolicy: false, // Required for PDF/Excel file downloads
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInputMiddleware);

// ─── Response-Time Middleware ─────────────────────────────────────────────────
// Logs: [ISO] METHOD /path → STATUS in XXXms
// Slow threshold: warns anything ≥ 1000ms (helps spot DB latency issues fast)
app.use((req, res, next) => {
  const start = Date.now();
  const ts = new Date().toISOString();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = ms >= 1000 ? '🐢 SLOW' : ms >= 400 ? '⚡' : '✅';
    const skipPaths = ['/uploads/', '/register', '/api/media/'];
    const shouldSkip = skipPaths.some(p => req.url.startsWith(p));
    if (!shouldSkip) {
      console.log(`[${ts}] ${level} ${req.method} ${req.url} → ${res.statusCode} in ${ms}ms`);
    }
  });
  next();
});


// ─── Serve the built register-web React app (public registration form) ───────
// __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REGISTER_WEB_DIST = path.join(__dirname, '../../register-web/dist');
app.use('/register', express.static(REGISTER_WEB_DIST));
app.get('/register', (_req, res) => res.sendFile(path.join(REGISTER_WEB_DIST, 'index.html')));
app.get('/register/*', (_req, res) => res.sendFile(path.join(REGISTER_WEB_DIST, 'index.html')));

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
app.use('/api/feedback', feedbackRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/developer/login', developerLoginLimiter);
app.use('/api/developer/request-otp', developerLoginLimiter);
app.use('/api/developer', developerRoutes);
app.use(legalRoutes)// ─── Public Hostel Info Endpoint (Used by React / React Native forms) ─────────
app.get('/api/public/hostel-info', async (req, res) => {
  try {
    const hostelId = req.query.hostelId as string;
    const hostelCode = req.query.code as string;

    let query = db('hostel_master');
    if (hostelId) {
      query = query.where('hostel_id', parseInt(hostelId, 10));
    } else if (hostelCode) {
      query = query.where('hostel_code', String(hostelCode).trim());
    } else {
      query = query.where('is_active', 1);
    }

    const hostel = await query.first();
    if (!hostel) {
      return res.status(404).json({ success: false, error: 'Hostel not found or invalid QR link' });
    }

    // Fetch configured room sharing types and pricing for this hostel
    const rawRooms = await db('rooms as r')
      .leftJoin('room_types as rt', 'r.room_type_id', 'rt.room_type_id')
      .where('r.hostel_id', hostel.hostel_id)
      .select('r.capacity', 'r.rent_per_bed', 'rt.room_type_name')
      .orderBy('r.capacity', 'asc');

    const shareMap = new Map<number, { share: number; name: string; rent: number; count: number }>();
    rawRooms.forEach((r: any) => {
      const cap = Number(r.capacity) || 1;
      const rent = Number(r.rent_per_bed) || 0;
      if (!shareMap.has(cap)) {
        shareMap.set(cap, {
          share: cap,
          name: r.room_type_name || `${cap} Sharing`,
          rent: rent,
          count: 1
        });
      } else {
        const item = shareMap.get(cap)!;
        item.count += 1;
        if ((!item.rent || item.rent === 0) && rent > 0) item.rent = rent;
      }
    });

    let sharingOptions = Array.from(shareMap.values()).sort((a, b) => a.share - b.share);

    // Fallback if hostel has no rooms configured yet
    if (sharingOptions.length === 0) {
      const standardTypes = await db('room_types').select('*').catch(() => []);
      if (standardTypes && standardTypes.length > 0) {
        sharingOptions = standardTypes.map((st: any) => {
          let cap = 1;
          const lower = (st.room_type_name || '').toLowerCase();
          if (lower.includes('single') || lower.includes('1')) cap = 1;
          else if (lower.includes('double') || lower.includes('2')) cap = 2;
          else if (lower.includes('triple') || lower.includes('3')) cap = 3;
          else if (lower.includes('4')) cap = 4;
          else if (lower.includes('5')) cap = 5;
          else if (lower.includes('6')) cap = 6;
          else if (lower.includes('8')) cap = 8;
          return {
            share: cap,
            name: st.room_type_name || `${cap} Sharing`,
            rent: Number(st.base_price) || 5000,
            count: 0
          };
        });
      } else {
        sharingOptions = [
          { share: 1, name: 'Single (Private)', rent: 10000, count: 0 },
          { share: 2, name: '2 Sharing', rent: 8000, count: 0 },
          { share: 3, name: '3 Sharing', rent: 6500, count: 0 },
          { share: 4, name: '4 Sharing', rent: 5000, count: 0 },
        ];
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        hostel_id: hostel.hostel_id,
        hostel_name: hostel.hostel_name,
        hostel_code: hostel.hostel_code,
        city: hostel.city,
        state: hostel.state,
        pincode: hostel.pincode,
        address: hostel.address,
        contact_number: hostel.contact_number,
        total_floors: hostel.total_floors,
        admission_fee: hostel.admission_fee,
        default_refundable_deposit: hostel.default_refundable_deposit,
        sharing_options: sharingOptions,
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch hostel info' });
  }
});

// Multer storage for the public QR signup photos (profile photo & ID proof photos)
const qrSignupUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `qr-signup-${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// Public QR tenant signup — redirects to React register-web app
// The React app is served at /register and built from register-web/dist
app.get('/api/public/qr-signup', (req, res) => {
  const { hostelId, roomId, bedId, bedName } = req.query as Record<string, string>;
  if (!hostelId) {
    return res.status(400).send('<p style="font-family:sans-serif;color:#7f1d1d;text-align:center;margin-top:60px;font-size:18px;">⚠️ Invalid QR link — missing hostel ID.</p>');
  }
  let url = `/register?hostelId=${encodeURIComponent(hostelId)}`;
  if (roomId)  url += `&roomId=${encodeURIComponent(roomId)}`;
  if (bedId)   url += `&bedId=${encodeURIComponent(bedId)}`;
  if (bedName) url += `&bedName=${encodeURIComponent(bedName)}`;
  return res.redirect(302, url);
});

app.post('/api/public/qr-signup', qrSignupUpload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'aadhaar_front', maxCount: 1 },
  { name: 'aadhaar_back', maxCount: 1 },
  { name: 'id_proof_front', maxCount: 1 },
  { name: 'id_proof_back', maxCount: 1 },
]), async (req, res) => {
  try {
    const hostelId = (req.query.hostelId || req.body.hostel_id || req.body.hostelId) as string;
    const roomId   = (req.query.roomId || req.body.room_id || req.body.roomId) as string | undefined;
    const bedId    = (req.query.bedId || req.body.bed_id || req.body.bedId) as string | undefined;
    const bedName  = (req.query.bedName || req.body.bed_name || req.body.bedName) as string | undefined;

    const sendError = (msg: string) => res.status(400).json({ success: false, error: msg });

    if (!hostelId) {
      return sendError('Missing hostel ID');
    }
    const {
      first_name, last_name, phone, email,
      date_of_birth, gender, permanent_address, present_working_address, current_address,
      guardian_name, guardian_phone, id_proof_number, id_proof_type
    } = req.body || {};

    const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
    const profilePhotoFile = files?.profile_photo?.[0];
    const aadhaarFrontFile = files?.id_proof_front?.[0] || files?.aadhaar_front?.[0];
    const aadhaarBackFile  = files?.id_proof_back?.[0] || files?.aadhaar_back?.[0];

    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const cleanGuardianPhone = String(guardian_phone || '').replace(/\D/g, '').slice(-10);

    if (!first_name || !String(first_name).trim()) return sendError('First Name is required');
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) return sendError('Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) return sendError('A valid Email address is required');
    if (!cleanGuardianPhone || cleanGuardianPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanGuardianPhone)) return sendError('Guardian Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9');
    
    const finalPermAddress = permanent_address || present_working_address || current_address;
    const finalCurrAddress = present_working_address || current_address || permanent_address;
    if (!finalPermAddress || !String(finalPermAddress).trim()) return sendError('Permanent Address is required');
    if (!finalCurrAddress || !String(finalCurrAddress).trim()) return sendError('Current Address is required');

    const typeId = parseInt(id_proof_type, 10) || 0;
    const cleanId = id_proof_number ? String(id_proof_number).trim().toUpperCase() : '';
    
    if (typeId > 0 && !cleanId) {
      return sendError('ID Proof number is required for the selected document type');
    }
    if (typeId === 1 && cleanId && !/^\d{12}$/.test(cleanId.replace(/\s+/g, ''))) return sendError('Aadhaar Number must be exactly 12 digits');
    if (typeId === 2 && cleanId && !/^[A-Z0-9]{10}$/.test(cleanId)) return sendError('PAN must be exactly 10 characters');
    if (typeId === 3 && cleanId && !/^[A-Z0-9]{10}$/.test(cleanId)) return sendError('Voter ID must be exactly 10 characters');
    if (typeId === 4 && cleanId && !/^[A-Z0-9]{15,16}$/.test(cleanId)) return sendError('Driving License must be 15-16 characters');
    if (typeId === 5 && cleanId && !/^[A-Z0-9]{8}$/.test(cleanId)) return sendError('Passport must be exactly 8 characters');

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

    let photoUrl: string | null = profilePhotoFile ? `/uploads/${profilePhotoFile.filename}` : null;
    let frontUrl: string | null = aadhaarFrontFile ? `/uploads/${aadhaarFrontFile.filename}` : null;
    let backUrl: string | null = aadhaarBackFile ? `/uploads/${aadhaarBackFile.filename}` : null;

    if (profilePhotoFile) {
      try {
        const uploaded = await processFileUpload(profilePhotoFile, 'students');
        if (uploaded) photoUrl = uploaded;
      } catch (e) {}
    }
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
      profile_photo_url: photoUrl,
      permanent_address: finalPermAddress ? String(finalPermAddress).trim() : null,
      present_working_address: finalCurrAddress ? String(finalCurrAddress).trim() : null,
      current_address:   finalCurrAddress ? String(finalCurrAddress).trim() : null,
      guardian_name:    guardian_name ? String(guardian_name).trim() : null,
      guardian_phone:   cleanGuardianPhone,
      admission_date:   nowStr,
      admission_fee:    0,
      admission_status: 'Unpaid',
      status:           3, // QR Signup — owner must activate
      room_id:          roomId ? parseInt(roomId, 10) : null,
      bed_id:           bedId || null,
      floor_number:     null,
      monthly_rent:     req.body.monthly_rent ? parseFloat(String(req.body.monthly_rent)) : (req.body.rent ? parseFloat(String(req.body.rent)) : null),
      id_proof_type:    typeId || null,
      id_proof_number:  cleanId || null,
      id_proof_status:  typeId ? 1 : 0, // Submitted
      id_proof_front_url: frontUrl,
      id_proof_back_url:  backUrl,
    };

    // Filter to only columns that actually exist in the table to prevent MySQL 1054 error
    try {
      const colInfo = await db('students').columnInfo();
      const validCols = Object.keys(colInfo);
      for (const key of Object.keys(insertData)) {
        if (!validCols.includes(key)) {
          delete insertData[key];
        }
      }
    } catch (_) {}

    let newStudentId: number;
    const [id] = await db('students').insert(insertData);
    newStudentId = id;

    const studentFullName = `${first_name} ${last_name || ''}`.trim();
    const referenceId = `REG-${hostelExists.hostel_code || 'HSTX'}-${1000 + newStudentId}`;

    // Notify the owner of the hostel
    sendNotificationToHostelOwner(
      numHostelId,
      'New Admission',
      'New Registration Request',
      `${studentFullName} has submitted a registration request via QR. Review and assign a room.`,
      'High',
      { studentId: newStudentId, studentName: studentFullName, referenceId }
    ).catch(err => console.error('[qr-signup] Owner notification error:', err));

    return res.status(200).json({
      success: true,
      message: 'Registration submitted successfully!',
      data: {
        student_id: newStudentId,
        student_name: studentFullName,
        reference_id: referenceId,
        hostel_name: hostelExists.hostel_name,
        hostel_code: hostelExists.hostel_code,
        admission_date: nowStr,
        status: 'Pending Owner Approval',
      }
    });
  } catch (error: any) {
    console.error('QR Signup POST Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

app.use('/api/public/qr-signup', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!err) return next();
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'Each ID photo must be under 5MB' : (err.message || 'Upload failed. Please try again.');
  return res.status(400).json({ success: false, error: message });
});

// Public QR Guest signup — redirects to React register-web app with type=guest
app.get('/api/public/guest-signup', (req, res) => {
  const { hostelId } = req.query as Record<string, string>;
  if (!hostelId) {
    return res.status(400).send('<p style="font-family:sans-serif;color:#7f1d1d;text-align:center;margin-top:60px;font-size:18px;">⚠️ Invalid QR link — missing hostel ID.</p>');
  }
  return res.redirect(302, `/register?hostelId=${encodeURIComponent(hostelId)}&type=guest`);
});

app.post('/api/public/guest-signup', qrSignupUpload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'id_proof_front', maxCount: 1 },
  { name: 'id_proof_back', maxCount: 1 },
]), publicGuestSignup);

app.use('/api/public/guest-signup', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!err) return next();
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'Each ID photo must be under 5MB' : (err.message || 'Upload failed. Please try again.');
  return res.status(400).json({ success: false, error: message });
});

// Health check
app.get(['/health', '/api/health'], (req, res) => {
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

