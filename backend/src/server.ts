// QR Signup form: v2 â€” fixed regex, toast CSS, no-redirect HTML serving
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
app.use(helmet({
  contentSecurityPolicy: false,
}));
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

// Public QR tenant signup â€” serves self-contained HTML (works on any device/IP)
app.get('/api/public/qr-signup', (req, res) => {
  const hostelId = req.query.hostelId as string;
  const roomId   = req.query.roomId   as string | undefined;
  const bedId    = req.query.bedId    as string | undefined;
  const bedName  = req.query.bedName  as string | undefined;

  if (!hostelId) {
    return res.status(400).send('<h2 style="font-family:sans-serif;color:#7f1d1d;">Missing hostelId</h2>');
  }

  const roomBanner = roomId
    ? `<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:14px 16px;margin-bottom:18px;"><div style="font-size:11px;color:#166534;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">ðŸ  Pre-assigned Allocation</div><div style="font-size:14px;color:#15803d;font-weight:600;">Room: <strong style="color:#14532d;">${roomId}</strong>${bedName ? ` &nbsp;Bed: <strong style="color:#14532d;">${bedName}</strong>` : ''}</div></div>`
    : '';

  const postUrl = `/api/public/qr-signup?hostelId=${encodeURIComponent(hostelId)}${roomId ? `&roomId=${encodeURIComponent(roomId)}` : ''}${bedId ? `&bedId=${encodeURIComponent(bedId)}` : ''}${bedName ? `&bedName=${encodeURIComponent(bedName)}` : ''}`;

  // NOTE: Inside this template literal, \\d renders as \d in the browser (digit regex class) - correct!
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0"/>
  <title>Tenant Registration</title>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    *,*::before,*::after{box-sizing:border-box;}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:linear-gradient(135deg,#F8FAFC 0%,#EEF2FF 100%);margin:0;min-height:100vh;padding:16px 12px 48px;}
    .card{max-width:500px;margin:0 auto;background:#fff;border-radius:24px;padding:24px 20px;box-shadow:0 12px 40px rgba(0,0,0,0.08);position:relative;overflow:hidden;}
    h1{margin:0 0 4px;color:#0F172A;font-size:21px;font-weight:800;text-align:center;}
    .sub{color:#64748B;font-size:13px;margin-bottom:18px;text-align:center;}
    .stepper{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;position:relative;padding:0 8px;}
    .stepper::before{content:'';position:absolute;top:14px;left:28px;right:28px;height:3px;background:#E2E8F0;z-index:1;border-radius:3px;}
    .sp{position:absolute;top:14px;left:28px;height:3px;background:#7C3AED;z-index:2;border-radius:3px;transition:width .3s ease;}
    .stp{position:relative;z-index:3;display:flex;flex-direction:column;align-items:center;gap:5px;width:56px;}
    .sc{width:30px;height:30px;border-radius:50%;background:#F1F5F9;border:2.5px solid #E2E8F0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#94A3B8;transition:all .3s;}
    .stp.active .sc{background:#fff;border-color:#7C3AED;color:#7C3AED;box-shadow:0 0 0 4px rgba(124,58,237,.12);}
    .stp.done .sc{background:#7C3AED;border-color:#7C3AED;color:#fff;}
    .sl{font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;transition:color .3s;text-align:center;}
    .stp.active .sl{color:#7C3AED;}.stp.done .sl{color:#1e293b;}
    .step{display:none;animation:si .25s ease;}.step.active{display:block;}
    @keyframes si{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:none}}
    .field{margin-bottom:14px;}
    lbl{display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;}
    .req{color:#EF4444;margin-left:2px;}
    .ig{position:relative;display:flex;align-items:center;}
    .ig i{position:absolute;left:12px;color:#94A3B8;width:20px;height:20px;pointer-events:none;transition:color .2s;}
    input,select,textarea{width:100%;padding:12px 13px 12px 42px;border:1.5px solid #E2E8F0;border-radius:12px;font-size:15px;color:#1E293B;outline:none;transition:all .18s;background:#F8FAFC;font-family:inherit;}
    select {appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:36px;}
    textarea{padding:12px;resize:vertical;min-height:80px;}
    .ig textarea{padding-left:42px;padding-top:14px;}
    .ig .lucide-map-pin{top:14px;}
    input:focus,select:focus,textarea:focus{border-color:#7C3AED;background:#fff;box-shadow:0 0 0 3px rgba(124,58,237,.1);}
    input:focus + i, select:focus + i, textarea:focus + i{color:#7C3AED;}
    .ig:has(input:focus) i, .ig:has(select:focus) i, .ig:has(textarea:focus) i {color:#7C3AED;}
    .ef input,.ef select,.ef textarea{border-color:#EF4444;background:#FEF2F2;}
    .em{display:block;color:#EF4444;font-size:11.5px;margin-top:4px;font-weight:600;min-height:14px;}
    .btns{display:flex;gap:10px;margin-top:20px;}
    .btn{flex:1;padding:14px;border-radius:14px;font-weight:700;font-size:15px;cursor:pointer;border:none;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:6px;}
    .bp{background:linear-gradient(135deg,#7C3AED,#5F2EEA);color:#fff;box-shadow:0 4px 14px rgba(124,58,237,.25);}
    .bp:hover{opacity:.9;}.bp:active{transform:scale(.98);}
    .bo{background:transparent;border:2px solid #E2E8F0;color:#475569;}
    .bo:hover{background:#F8FAFC;border-color:#CBD5E1;}
    .fw input[type=file]{position:absolute;width:1px;height:1px;opacity:0;}
    .fb{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border:2px dashed #C4B5FD;border-radius:12px;background:#FAF5FF;color:#7C3AED;font-size:14px;font-weight:700;cursor:pointer;transition:all .18s;margin-bottom:12px;}
    .fb.has{border-style:solid;border-color:#7C3AED;background:#F5F3FF;}
    .fb i{width:20px;height:20px;}
    #toast{position:fixed;top:16px;left:50%;transform:translateX(-50%) translateY(-120px);background:#EF4444;color:#fff;padding:12px 24px;border-radius:100px;font-size:14px;font-weight:700;box-shadow:0 8px 24px rgba(239,68,68,.3);transition:transform .4s cubic-bezier(.34,1.56,.64,1);z-index:1000;display:flex;align-items:center;gap:8px;white-space:nowrap;max-width:90%;text-align:center;}
    #toast.show{transform:translateX(-50%) translateY(0);}
    #ldr{position:absolute;inset:0;background:rgba(255,255,255,.94);z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s;border-radius:24px;backdrop-filter:blur(4px);}
    #ldr.show{opacity:1;pointer-events:all;}
    .spin{width:46px;height:46px;border:4px solid #EDE9FE;border-top-color:#7C3AED;border-radius:50%;animation:sp .7s linear infinite;margin-bottom:16px;}
    @keyframes sp{to{transform:rotate(360deg)}}
    #ok{display:none;text-align:center;padding:50px 10px 30px;}
    .ck{width:86px;height:86px;background:linear-gradient(135deg,#10B981,#059669);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin:0 auto 24px;color:#fff;box-shadow:0 12px 32px rgba(16,185,129,.35);animation:pop .6s cubic-bezier(.34,1.56,.64,1);}
    .ck i{width:46px;height:46px;color:#fff;}
    @keyframes pop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.1)}to{transform:scale(1);opacity:1}}
    #ok h2{color:#0F172A;font-size:24px;margin:0 0 12px;font-weight:800;}
    #ok p{color:#64748B;font-size:15px;line-height:1.6;margin-bottom:32px;}
    .logo{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#7C3AED,#5F2EEA);display:inline-flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(124,58,237,.3);margin-bottom:16px;}
    .logo i{width:32px;height:32px;color:#fff;}
  </style>
</head>
<body>
  <div id="toast"><i data-lucide="alert-circle" style="width:18px;height:18px;color:#fff;"></i> <span id="tm">Error</span></div>
  <div class="card" id="mc">
    <div id="ldr"><div class="spin"></div><div style="color:#5B21B6;font-weight:700;font-size:16px;">Submitting...</div></div>
    <div id="fc">
      <div style="text-align:center;margin-bottom:16px;"><div class="logo"><i data-lucide="user-plus"></i></div></div>
      <h1>Tenant Registration</h1>
      <p class="sub">Complete the steps below to request admission</p>
      ${roomBanner}

      <div class="stepper">
        <div class="sp" id="prog" style="width:0%"></div>
        <div class="stp active" id="n1"><div class="sc" id="c1">1</div><div class="sl">Personal</div></div>
        <div class="stp" id="n2"><div class="sc" id="c2">2</div><div class="sl">Guardian</div></div>
        <div class="stp" id="n3"><div class="sc" id="c3">3</div><div class="sl">Identity</div></div>
      </div>

      <form id="frm" novalidate>
        <!-- STEP 1 -->
        <div class="step active" id="p1">
          <div class="field">
            <lbl>First Name<span class="req">*</span></lbl>
            <div class="ig"><i data-lucide="user"></i><input id="first_name" name="first_name" placeholder="e.g. Ravi"/></div>
            <span class="em" id="e1"></span>
          </div>
          <div class="field">
            <lbl>Last Name</lbl>
            <div class="ig"><i data-lucide="user"></i><input id="last_name" name="last_name" placeholder="e.g. Kumar"/></div>
          </div>
          <div class="field">
            <lbl>Phone Number<span class="req">*</span></lbl>
            <div class="ig"><i data-lucide="phone"></i><input id="phone" name="phone" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number"/></div>
            <span class="em" id="e2"></span>
          </div>
          <div class="field">
            <lbl>Email Address</lbl>
            <div class="ig"><i data-lucide="mail"></i><input id="email" name="email" type="email" placeholder="your@email.com"/></div>
            <span class="em" id="e3"></span>
          </div>
          <div class="field">
            <lbl>Date of Birth<span class="req">*</span></lbl>
            <div class="ig"><i data-lucide="calendar"></i><input id="dob" name="date_of_birth" type="date"/></div>
            <span class="em" id="e_dob"></span>
          </div>
          <div class="field">
            <lbl>Gender<span class="req">*</span></lbl>
            <div class="ig">
              <i data-lucide="users"></i>
              <select id="gender" name="gender"><option value="">Select Gender...</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select>
            </div>
            <span class="em" id="e_gender"></span>
          </div>
          <div class="field">
            <lbl>Permanent Address<span class="req">*</span></lbl>
            <div class="ig"><i data-lucide="map-pin"></i><textarea id="addr" name="permanent_address" placeholder="Full home address"></textarea></div>
            <span class="em" id="e4"></span>
          </div>
          <div class="btns"><button type="button" class="btn bp" id="b1">Next: Guardian Details <i data-lucide="arrow-right" style="width:18px;height:18px;"></i></button></div>
        </div>

        <!-- STEP 2 -->
        <div class="step" id="p2">
          <p style="font-size:14px;color:#64748B;margin:0 0 16px;line-height:1.5;">Guardian details are optional but recommended.</p>
          <div class="field">
            <lbl>Guardian Name</lbl>
            <div class="ig"><i data-lucide="user"></i><input id="gname" name="guardian_name" placeholder="Parent / Guardian name"/></div>
          </div>
          <div class="field">
            <lbl>Guardian Phone</lbl>
            <div class="ig"><i data-lucide="phone"></i><input id="gphone" name="guardian_phone" inputmode="numeric" maxlength="10" placeholder="10-digit number"/></div>
            <span class="em" id="e5"></span>
          </div>
          <div class="btns">
            <button type="button" class="btn bo" id="bk2"><i data-lucide="arrow-left" style="width:18px;height:18px;"></i> Back</button>
            <button type="button" class="btn bp" id="b2">Next: Identity Docs <i data-lucide="arrow-right" style="width:18px;height:18px;"></i></button>
          </div>
        </div>

        <!-- STEP 3 -->
        <div class="step" id="p3">
          <div class="field">
            <lbl>Aadhaar Number<span class="req">*</span></lbl>
            <div class="ig"><i data-lucide="credit-card"></i><input id="aadhaar" name="id_proof_number" inputmode="numeric" maxlength="12" placeholder="12-digit Aadhaar number"/></div>
            <span class="em" id="e6"></span>
          </div>
          <p style="font-size:13px;color:#64748B;margin:0 0 14px;">Upload clear Aadhaar photos (optional).</p>
          <div class="fw"><label class="fb" id="ffb" for="af"><i data-lucide="camera" id="fi"></i> <span id="ffl">Upload Aadhaar Front</span></label><input type="file" id="af" name="aadhaar_front" accept="image/*"/></div>
          <div class="fw"><label class="fb" id="bfb" for="ab"><i data-lucide="camera" id="bi"></i> <span id="bfl">Upload Aadhaar Back</span></label><input type="file" id="ab" name="aadhaar_back" accept="image/*"/></div>
          <div class="btns">
            <button type="button" class="btn bo" id="bk3"><i data-lucide="arrow-left" style="width:18px;height:18px;"></i> Back</button>
            <button type="submit" class="btn bp" id="sub"><i data-lucide="check" style="width:18px;height:18px;"></i> Submit Application</button>
          </div>
        </div>
      </form>
    </div>

    <div id="ok">
      <div class="ck"><i data-lucide="check-circle-2" style="width:46px;height:46px;stroke-width:2.5;"></i></div>
      <h2>Application Sent!</h2>
      <p>Your details have been submitted successfully. The owner will verify and activate your account in the app.</p>
      <button class="btn bp" onclick="window.location.reload()"><i data-lucide="refresh-cw" style="width:18px;height:18px;"></i> Submit Another</button>
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
      el.textContent=m;
      if(i) i.parentElement.parentElement.className='field'+(m?' ef':'');
    }
    function val(id){ return (document.getElementById(id)||{}).value||''; }

    // Digits only
    var ids = ['phone','gphone','aadhaar'];
    for(var k=0; k<ids.length; k++){
      (function(id){
        var el=document.getElementById(id);
        if(el) el.addEventListener('input',function(e){ e.target.value=e.target.value.replace(/\\D/g,''); });
      })(ids[k]);
    }

    // Step 1 next
    document.getElementById('b1').addEventListener('click',function(){
      var ok=true;
      if(!val('first_name').trim()){setErr('e1','first_name','First name is required');ok=false;}else{setErr('e1','first_name','');}
      var p = val('phone').trim();
      if(!/^[6-9]\\d{9}$/.test(p)){
        if(p.length > 0 && /^[1-5]/.test(p)) {
          setErr('e2','phone','Mobile number must start with 6, 7, 8, or 9');
        } else {
          setErr('e2','phone','Enter a valid 10-digit mobile number starting with 6-9');
        }
        ok=false;
      }else{setErr('e2','phone','');}
      var em = val('email').trim();
      if(em&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(em)){setErr('e3','email','Enter a valid email');ok=false;}else{setErr('e3','email','');}
      if(!val('dob').trim()){setErr('e_dob','dob','Date of Birth is required');ok=false;}else{setErr('e_dob','dob','');}
      if(!val('gender').trim()){setErr('e_gender','gender','Gender is required');ok=false;}else{setErr('e_gender','gender','');}
      if(!val('addr').trim()){setErr('e4','addr','Permanent address is required');ok=false;}else{setErr('e4','addr','');}
      if(!ok){toast('Please fix the errors to continue.');return;}
      go(2);
    });

    document.getElementById('bk2').addEventListener('click',function(){go(1);});
    document.getElementById('b2').addEventListener('click',function(){
      var gp=val('gphone').trim();
      if(gp&&!/^\\d{10}$/.test(gp)){setErr('e5','gphone','Enter a valid 10-digit number');toast('Please fix the errors to continue.');return;}
      setErr('e5','gphone',''); go(3);
    });

    document.getElementById('bk3').addEventListener('click',function(){go(2);});

    // File inputs
    var cfgs = [{inp:'af',fb:'ffb',lbl:'ffl',icon:'fi',side:'Front'},{inp:'ab',fb:'bfb',lbl:'bfl',icon:'bi',side:'Back'}];
    for(var m=0; m<cfgs.length; m++){
      (function(cfg){
        var f=document.getElementById(cfg.inp),b=document.getElementById(cfg.fb),l=document.getElementById(cfg.lbl),i=document.getElementById(cfg.icon);
        if(f)f.addEventListener('change',function(){
          var has=f.files&&f.files.length;
          b.className='fb'+(has?' has':'');
          l.textContent=has?f.files[0].name:'Upload Aadhaar '+cfg.side;
          if(has){ i.setAttribute('data-lucide','check'); i.style.color='#7C3AED'; }
          else{ i.setAttribute('data-lucide','camera'); i.style.color='#94A3B8'; }
          lucide.createIcons();
        });
      })(cfgs[m]);
    }

    // Submit
    document.getElementById('frm').addEventListener('submit',function(e){
      e.preventDefault();
      var aadhaar=val('aadhaar').trim();
      if(!/^\\d{12}$/.test(aadhaar)){setErr('e6','aadhaar','Aadhaar must be exactly 12 digits');toast('Please fix the errors to submit.');return;}
      setErr('e6','aadhaar','');
      
      document.getElementById('ldr').className='show';
      var d=new FormData(this);
      fetch('${postUrl}',{method:'POST',body:d})
        .then(function(r){return r.json();})
        .then(function(res){
          document.getElementById('ldr').className='';
          if(res.success){
            document.getElementById('fc').style.display='none';
            document.getElementById('ok').style.display='block';
          }else{
            if((res.error||'').toLowerCase().indexOf('aadhaar')!==-1){setErr('e6','aadhaar',res.error);go(3);}
            toast(res.error||'Upload failed. Try again.');
          }
        })
        .catch(function(err){
          document.getElementById('ldr').className='';
          toast('Network error. Try again.');
        });
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Prevent browser caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
});

const qrSignupErrorPage = (message: string) =>
  `<div style="background:#fef2f2;color:#7f1d1d;padding:14px;border-radius:10px;font-family:sans-serif;">âš ï¸ ${message}</div>`;

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
      date_of_birth:    new Date(date_of_birth),
      gender:           String(gender).trim(),
      permanent_address: permanent_address || null,
      guardian_name:    guardian_name || null,
      guardian_phone:   guardian_phone || null,
      admission_date:   now,
      admission_fee:    0,
      admission_status: 0,
      status:           3, // QR Signup â€” owner must activate
      room_id:          roomId ? parseInt(roomId, 10) : null,
      floor_number:     null,
      monthly_rent:     null,
      id_proof_type:      1, // 1 = Aadhaar in id_proof_types table
      id_proof_number:    String(id_proof_number).trim(),
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

  console.log(`ðŸš€ Server running on ${serverAddress}`);
  console.log(`ðŸ” Environment: ${NODE_ENV}`);
  console.log(`ðŸ“ Listening on ${HOST}:${PORT}`);

  // Start Background Cron Jobs
  startMonthlyFeesGenerationJob();
  startGuestOverstayJob();
  startChatResetJob();


  console.log('â° Cron jobs initialized');
});

export default app;

