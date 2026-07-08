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
    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:16px;margin-bottom:20px;">
      <div style="font-size:13px;color:#166534;font-weight:800;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">🏠 Pre-assigned Allocation</div>
      <div style="font-size:15px;color:#15803d;font-weight:600;">
        Room: <strong style="color:#14532d;">${roomId}</strong>${bedName ? `&nbsp;&nbsp;Bed: <strong style="color:#14532d;">${bedName}</strong>` : ''}
      </div>
      <div style="font-size:12px;color:#16a34a;margin-top:6px;font-weight:500;">This room/bed has been reserved for you by the owner.</div>
    </div>
  ` : '';

  const formAction = `/api/public/qr-signup?hostelId=${encodeURIComponent(hostelId)}${roomId ? `&roomId=${encodeURIComponent(roomId)}` : ''}${bedId ? `&bedId=${encodeURIComponent(bedId)}` : ''}${bedName ? `&bedName=${encodeURIComponent(bedName)}` : ''}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
      <title>Tenant Registration — Hostel</title>
      <style>
        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg,#F8FAFC 0%,#F1F5F9 100%); margin:0; min-height:100vh; padding:16px 12px 40px; }
        .card { max-width:520px; margin:0 auto; background:#fff; border-radius:24px; padding:24px 20px; box-shadow:0 12px 40px rgba(0,0,0,0.06); position: relative; overflow: hidden; }
        .logo { text-align:center; margin-bottom:16px; }
        .logo-icon { width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#7C3AED,#5F2EEA);display:inline-flex;align-items:center;justify-content:center;font-size:26px; box-shadow:0 4px 12px rgba(124,58,237,0.3); }
        h2 { margin:0 0 6px;color:#0F172A;font-size:22px;font-weight:800; text-align: center; letter-spacing: -0.5px; }
        .subtitle { color:#64748B;font-size:13px;margin-bottom:24px; text-align: center; }
        
        /* Stepper UI */
        .stepper { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; position: relative; padding: 0 10px; }
        .stepper::before { content: ''; position: absolute; top: 14px; left: 30px; right: 30px; height: 3px; background: #E2E8F0; z-index: 1; border-radius: 3px; }
        .step-progress { position: absolute; top: 14px; left: 30px; height: 3px; background: #7C3AED; z-index: 2; border-radius: 3px; transition: width 0.3s ease; }
        
        .step { position: relative; z-index: 3; display: flex; flex-direction: column; align-items: center; gap: 6px; width: 60px; }
        .step-circle { width: 32px; height: 32px; border-radius: 50%; background: #F1F5F9; border: 3px solid #F1F5F9; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #94A3B8; transition: all 0.3s ease; }
        .step.active .step-circle { background: #fff; border-color: #7C3AED; color: #7C3AED; box-shadow: 0 0 0 4px rgba(124,58,237,0.1); }
        .step.completed .step-circle { background: #7C3AED; border-color: #7C3AED; color: #fff; }
        .step-label { font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; transition: color 0.3s ease; text-align: center; }
        .step.active .step-label { color: #7C3AED; }
        .step.completed .step-label { color: #0F172A; }
        
        /* Step Content */
        .step-content { display: none; animation: slideIn 0.3s ease; }
        .step-content.active { display: block; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }

        .field { margin-bottom:16px; width: 100%; }
        label { display:flex; align-items:center; font-size:13px; color:#334155; margin-bottom:6px; font-weight:700; }
        .required { color: #EF4444; margin-left: 4px; font-size: 14px; }
        
        input, select, textarea { width:100%;padding:14px 16px;border:1.5px solid #E2E8F0;border-radius:12px;font-size:15px;color:#1E293B;outline:none;transition:all .2s; background: #F8FAFC; font-family: inherit; }
        input:focus, select:focus, textarea:focus { border-color:#7C3AED; background: #fff; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .field input.invalid, .field select.invalid, .field textarea.invalid { border-color:#EF4444; background: #FEF2F2; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
        textarea { resize: vertical; min-height: 80px; }
        
        .err-msg { display:block; color:#EF4444; font-size:12px; margin-top:4px; min-height:16px; font-weight: 600; }
        
        .btn-group { display: flex; gap: 12px; margin-top: 24px; }
        .btn { flex: 1; background:linear-gradient(135deg,#7C3AED,#5F2EEA);color:#fff;border:none;padding:16px;border-radius:14px;font-weight:700;font-size:16px;cursor:pointer;transition: transform 0.1s, opacity 0.2s; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(124,58,237,0.25); }
        .btn:active { transform: scale(0.98); }
        .btn:hover { opacity:.92; }
        .btn.outline { background: transparent; border: 2px solid #E2E8F0; color: #475569; box-shadow: none; }
        .btn.outline:hover { border-color: #CBD5E1; background: #F8FAFC; }
        
        .file-field input[type="file"] { position:absolute; width:1px; height:1px; opacity:0; overflow:hidden; }
        .file-btn { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:18px; border:2px dashed #C4B5FD; border-radius:12px; background:#FAF5FF; color:#7C3AED; font-size:14px; font-weight:700; cursor:pointer; text-align:center; transition: all 0.2s; }
        .file-btn.has-file { border-style:solid; border-color:#7C3AED; background:#F5F3FF; color: #5B21B6; }
        
        /* Toast */
        #toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-100px); background: #EF4444; color: #fff; padding: 14px 24px; border-radius: 30px; font-size: 14px; font-weight: 700; box-shadow: 0 8px 16px rgba(239, 68, 68, 0.25); transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); z-index: 1000; display: flex; align-items: center; gap: 8px; white-space: nowrap; max-width: 90%; }
        #toast.show { transform: translateX(-50%) translateY(0); }
        
        /* Loader Overlay */
        #loader { position: absolute; inset: 0; background: rgba(255,255,255,0.9); z-index: 999; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; border-radius: 24px; }
        #loader.show { opacity: 1; pointer-events: all; }
        .spinner { width: 44px; height: 44px; border: 4px solid #EDE9FE; border-top-color: #7C3AED; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 20px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        /* Success Screen */
        #success-screen { display: none; text-align: center; padding: 40px 0 20px; animation: fadeIn 0.5s ease; }
        .check-circle { width: 88px; height: 88px; background: #10B981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 28px; color: #fff; font-size: 44px; box-shadow: 0 12px 32px rgba(16, 185, 129, 0.35); animation: popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        #success-screen h3 { color: #0F172A; font-size: 26px; margin: 0 0 12px; font-weight: 800; }
        #success-screen p { color: #64748B; font-size: 15px; line-height: 1.6; margin-bottom: 36px; padding: 0 10px; }
      </style>
    </head>
    <body>
      <div id="toast">⚠️ <span id="toast-msg">Error</span></div>
      
      <div class="card" id="main-card">
        <div id="loader">
          <div class="spinner"></div>
          <div style="color: #5B21B6; font-weight: 700; font-size: 16px;">Submitting Application...</div>
        </div>

        <div id="form-container">
          <div class="logo"><div class="logo-icon">🏠</div></div>
          <h2>Tenant Registration</h2>
          <p class="subtitle">Complete the steps below to request admission</p>

          ${roomBanner}

          <!-- Stepper Navigation -->
          <div class="stepper">
            <div class="step-progress" id="step-progress" style="width: 0%;"></div>
            
            <div class="step active" id="step-nav-1">
              <div class="step-circle" id="step-circle-1">1</div>
              <div class="step-label">Personal</div>
            </div>
            <div class="step" id="step-nav-2">
              <div class="step-circle" id="step-circle-2">2</div>
              <div class="step-label">Guardian</div>
            </div>
            <div class="step" id="step-nav-3">
              <div class="step-circle" id="step-circle-3">3</div>
              <div class="step-label">Identity</div>
            </div>
          </div>

          <form id="signupForm" novalidate>
            
            <!-- STEP 1: Personal Details -->
            <div class="step-content active" id="step-1">
              <div class="field">
                <label>First Name <span class="required">*</span></label>
                <input name="first_name" id="first_name" required placeholder="e.g. Ravi" />
                <span class="err-msg" id="err-first_name"></span>
              </div>
              
              <div class="field">
                <label>Last Name</label>
                <input name="last_name" id="last_name" placeholder="e.g. Kumar" />
                <span class="err-msg" id="err-last_name"></span>
              </div>
              
              <div class="field">
                <label>Phone <span class="required">*</span></label>
                <input name="phone" id="phone" inputmode="numeric" maxlength="10" required placeholder="10-digit mobile number" />
                <span class="err-msg" id="err-phone"></span>
              </div>
              
              <div class="field">
                <label>Email Address</label>
                <input name="email" id="email" type="email" placeholder="your@email.com" />
                <span class="err-msg" id="err-email"></span>
              </div>
              
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
              
              <div class="field">
                <label>Permanent Address <span class="required">*</span></label>
                <textarea name="permanent_address" id="permanent_address" required placeholder="Full home address"></textarea>
                <span class="err-msg" id="err-permanent_address"></span>
              </div>
              
              <div class="btn-group">
                <button type="button" class="btn" onclick="nextStep(1)">Next: Guardian Details →</button>
              </div>
            </div>

            <!-- STEP 2: Guardian Details -->
            <div class="step-content" id="step-2">
              <div style="margin-bottom: 20px;">
                <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin-bottom: 12px;">Providing guardian details is optional but recommended.</p>
              </div>
              
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
              
              <div class="btn-group">
                <button type="button" class="btn outline" onclick="prevStep(2)">← Back</button>
                <button type="button" class="btn" onclick="nextStep(2)">Next: Identity Docs →</button>
              </div>
            </div>

            <!-- STEP 3: Documents -->
            <div class="step-content" id="step-3">
              <div class="field">
                <label>Aadhaar Number <span class="required">*</span></label>
                <input name="id_proof_number" id="id_proof_number" inputmode="numeric" maxlength="12" required placeholder="12-digit Aadhaar number" />
                <span class="err-msg" id="err-id_proof_number"></span>
              </div>
              
              <div style="margin-bottom: 20px;">
                <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin-bottom: 16px;">Upload clear photos of your Aadhaar card. You can choose from your gallery or take a new photo.</p>
                <div class="field file-field">
                  <label class="file-btn" id="btn-aadhaar_front" for="aadhaar_front">
                    <span id="label-aadhaar_front">📷 Tap to Upload Front</span>
                  </label>
                  <input type="file" name="aadhaar_front" id="aadhaar_front" accept="image/*" />
                </div>
                
                <div class="field file-field">
                  <label class="file-btn" id="btn-aadhaar_back" for="aadhaar_back">
                    <span id="label-aadhaar_back">📷 Tap to Upload Back</span>
                  </label>
                  <input type="file" name="aadhaar_back" id="aadhaar_back" accept="image/*" />
                </div>
              </div>
              
              <div class="btn-group">
                <button type="button" class="btn outline" onclick="prevStep(3)">← Back</button>
                <button type="submit" class="btn" id="submitBtn">✓ Submit Application</button>
              </div>
            </div>
          </form>
        </div>
        
        <!-- Success Screen -->
        <div id="success-screen">
          <div class="check-circle">✓</div>
          <h3>Application Sent!</h3>
          <p>Your details have been successfully submitted. You will be activated in the app once the owner verifies your request.</p>
          <button class="btn" style="margin-top: 10px;" onclick="window.location.reload()">Submit Another Form</button>
        </div>
      </div>

      <script>
        var currentStep = 1;

        function updateStepperUI(step) {
          var progress = step === 1 ? 0 : step === 2 ? 50 : 100;
          document.getElementById('step-progress').style.width = progress + '%';
          
          for (var i = 1; i <= 3; i++) {
            var nav = document.getElementById('step-nav-' + i);
            var circle = document.getElementById('step-circle-' + i);
            
            nav.classList.remove('active');
            nav.classList.remove('completed');
            if (i === step) {
              nav.classList.add('active');
              circle.innerHTML = i;
            } else if (i < step) {
              nav.classList.add('completed');
              circle.innerHTML = '✓';
            } else {
              circle.innerHTML = i;
            }
          }
          
          var contents = document.querySelectorAll('.step-content');
          for (var j = 0; j < contents.length; j++) {
            contents[j].classList.remove('active');
          }
          document.getElementById('step-' + step).classList.add('active');
          if (window.scrollTo) {
            try {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (e) {
              window.scrollTo(0, 0);
            }
          }
        }

        function prevStep(step) {
          currentStep = step - 1;
          updateStepperUI(currentStep);
        }

        function nextStep(step) {
          var ok = true;
          var form = document.getElementById('signupForm');
          
          if (step === 1) {
            if (!form.first_name.value.trim()) { showError('first_name', 'First name is required'); ok = false; }
            else { showError('first_name', ''); }

            var phone = form.phone.value.trim();
            if (!/^\\d{10}$/.test(phone)) { showError('phone', 'Enter a valid 10-digit mobile number'); ok = false; }
            else { showError('phone', ''); }

            var email = form.email.value.trim();
            if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) { showError('email', 'Enter a valid email address'); ok = false; }
            else { showError('email', ''); }

            if (!form.permanent_address.value.trim()) { showError('permanent_address', 'Permanent address is required'); ok = false; }
            else { showError('permanent_address', ''); }
          }
          
          if (step === 2) {
            var gphone = form.guardian_phone.value.trim();
            if (gphone && !/^\\d{10}$/.test(gphone)) { showError('guardian_phone', 'Enter a valid 10-digit number'); ok = false; }
            else { showError('guardian_phone', ''); }
          }

          if (!ok) {
            showToast('Please fix the errors above.');
            var firstInvalid = form.querySelector('.invalid');
            if (firstInvalid && firstInvalid.scrollIntoView) {
              try { firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
              catch(e) { firstInvalid.scrollIntoView(); }
            }
            return;
          }
          
          currentStep = step + 1;
          updateStepperUI(currentStep);
        }

        function showToast(msg) {
          var t = document.getElementById('toast');
          document.getElementById('toast-msg').textContent = msg;
          t.classList.add('show');
          setTimeout(function() { t.classList.remove('show'); }, 4000);
        }

        function showError(name, msg) {
          var el = document.getElementById('err-' + name);
          var input = document.getElementById(name);
          if (el) el.textContent = msg || '';
          if (input) {
            if (msg) input.classList.add('invalid');
            else input.classList.remove('invalid');
          }
        }

        var fileFields = ['aadhaar_front', 'aadhaar_back'];
        for (var k = 0; k < fileFields.length; k++) {
          (function(name) {
            var input = document.getElementById(name);
            var btn = document.getElementById('btn-' + name);
            var label = document.getElementById('label-' + name);
            if (input) {
              input.addEventListener('change', function () {
                var hasFile = input.files && input.files.length > 0;
                if (hasFile) {
                  btn.classList.add('has-file');
                  label.textContent = '✓ ' + input.files[0].name;
                } else {
                  btn.classList.remove('has-file');
                  label.textContent = '📷 Tap to Upload ' + (name === 'aadhaar_front' ? 'Front' : 'Back');
                }
              });
            }
          })(fileFields[k]);
        }

        var signupForm = document.getElementById('signupForm');
        if (signupForm) {
          signupForm.addEventListener('submit', function (e) {
            e.preventDefault();
            
            var ok = true;
            var form = e.target;
            
            var aadhaar = form.id_proof_number.value.trim();
            if (!/^\\d{12}$/.test(aadhaar)) { showError('id_proof_number', 'Aadhaar must be exactly 12 digits'); ok = false; }
            else { showError('id_proof_number', ''); }

            if (!ok) {
              showToast('Please fix the errors in Identity tab.');
              return;
            }

            var submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            
            var formData = new FormData(form);
            var actionUrl = "${formAction}";
            
            document.getElementById('loader').classList.add('show');

            fetch(actionUrl, {
              method: 'POST',
              body: formData,
              headers: {
                'Accept': 'application/json'
              }
            })
            .then(function(response) {
              return response.json().then(function(data) {
                return { response: response, data: data };
              });
            })
            .then(function(result) {
              var response = result.response;
              var data = result.data;
              document.getElementById('loader').classList.remove('show');
              submitBtn.disabled = false;

              if (response.ok && data.success) {
                document.getElementById('form-container').style.display = 'none';
                document.getElementById('success-screen').style.display = 'block';
              } else {
                showToast(data.error || 'Registration failed. Please try again.');
                if (data.error && data.error.toLowerCase().indexOf('aadhaar') !== -1) {
                  showError('id_proof_number', data.error);
                  currentStep = 3;
                  updateStepperUI(3);
                }
              }
            })
            .catch(function(err) {
              document.getElementById('loader').classList.remove('show');
              submitBtn.disabled = false;
              showToast('Network error. Please check your connection.');
            });
          });
        }
      </script>
    </body>
    </html>
  `;
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
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
