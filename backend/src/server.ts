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
import { startMonthlyFeesGenerationJob } from './jobs/monthlyFeesGeneration.js';

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
  // Development defaults
  return NODE_ENV === 'production'
    ? []
    : ['http://localhost:3000', 'http://localhost:5173'];
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

// Public QR student signup (no auth)
app.get('/api/public/qr-signup', async (req, res) => {
  const hostelId = req.query.hostelId as string;
  if (!hostelId) {
    return res.status(400).send('<h2>Missing hostelId</h2>');
  }
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Hostel Registration</title>
      <style>
        body { font-family: Arial, sans-serif; background:#f7fafc; margin:0; padding:20px; }
        .card { max-width: 540px; margin: 0 auto; background:#fff; border-radius:12px; padding:20px; box-shadow:0 8px 24px rgba(0,0,0,0.08); }
        h2 { margin-top:0; color:#111827; }
        .field { margin-bottom:12px; }
        label { display:block; font-size:13px; color:#374151; margin-bottom:6px; }
        input { width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:8px; font-size:14px; }
        .row { display:flex; gap:12px; }
        .row .field { flex:1; }
        .btn { width:100%; background:#10B981; color:#fff; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; }
        .note { font-size:12px; color:#6b7280; margin-top:8px; }
        .success { background:#ecfdf5; color:#065f46; padding:10px; border-radius:8px; margin-bottom:12px; }
        .error { background:#fef2f2; color:#7f1d1d; padding:10px; border-radius:8px; margin-bottom:12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Hostel Registration</h2>
        <p class="note">Fill your details. Your profile will appear as Inactive until the owner approves.</p>
        <form method="POST" action="/api/public/qr-signup?hostelId=${encodeURIComponent(hostelId)}">
          <div class="row">
            <div class="field">
              <label>First Name</label>
              <input name="first_name" required />
            </div>
            <div class="field">
              <label>Last Name</label>
              <input name="last_name" />
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>Phone</label>
              <input name="phone" pattern="\\d{10}" required />
            </div>
            <div class="field">
              <label>Email</label>
              <input name="email" type="email" />
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>Date of Birth</label>
              <input name="date_of_birth" type="date" />
            </div>
            <div class="field">
              <label>Gender</label>
              <input name="gender" placeholder="Male/Female/Other" />
            </div>
          </div>
          <div class="field">
            <label>Permanent Address</label>
            <input name="permanent_address" />
          </div>
          <div class="row">
            <div class="field">
              <label>Guardian Name</label>
              <input name="guardian_name" />
            </div>
            <div class="field">
              <label>Guardian Phone</label>
              <input name="guardian_phone" pattern="\\d{10}" />
            </div>
          </div>
          <button class="btn" type="submit">Submit</button>
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
    if (!hostelId) {
      return res.status(400).send('<div class="error">Missing hostelId</div>');
    }
    const {
      first_name, last_name, phone, email,
      date_of_birth, gender, permanent_address,
      guardian_name, guardian_phone
    } = req.body || {};
    if (!first_name || !phone) {
      return res.status(400).send('<div class="error">First Name and Phone are required</div>');
    }
    const now = new Date();
    const insertData: any = {
      hostel_id: parseInt(hostelId, 10),
      first_name,
      last_name,
      phone,
      email,
      date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
      gender,
      permanent_address,
      guardian_name,
      guardian_phone,
      admission_date: now,
      admission_fee: 0,
      admission_status: 0,
      status: 0, // Inactive until owner approves
      room_id: null,
      floor_number: null,
      monthly_rent: null,
      id_proof_status: 0,
    };
    await db('students').insert(insertData);
    res.status(200).send(`
      <div class="success">Submitted successfully. Please wait for owner approval.</div>
      <a href="/api/public/qr-signup?hostelId=${encodeURIComponent(hostelId)}">Back</a>
    `);
  } catch (e: any) {
    console.error('QR signup error:', e);
    res.status(500).send('<div class="error">Internal Server Error</div>');
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
    message: 'Hostel Management API',
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
  console.log(`⏰ Cron jobs initialized`);
});

export default app;
