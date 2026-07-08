// QR Signup form: v2 — fixed regex, toast CSS, no-redirect HTML serving
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

// Public QR tenant signup — serves self-contained HTML (works on any device/IP)
app.get('/api/public/qr-signup', (req, res) => {
  const hostelId = req.query.hostelId as string;
  const roomId   = req.query.roomId   as string | undefined;
  const bedId    = req.query.bedId    as string | undefined;
  const bedName  = req.query.bedName  as string | undefined;

  if (!hostelId) {
    return res.status(400).send('<h2 style="font-family:sans-serif;color:#7f1d1d;">Missing hostelId</h2>');
  }

  const roomBanner = roomId
    ? `<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:14px 16px;margin-bottom:18px;"><div style="font-size:11px;color:#166534;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">🏠 Pre-assigned Allocation</div><div style="font-size:14px;color:#15803d;font-weight:600;">Room: <strong style="color:#14532d;">${roomId}</strong>${bedName ? ` &nbsp;Bed: <strong style="color:#14532d;">${bedName}</strong>` : ''}</div></div>`
    : '';

  const postUrl = `/api/public/qr-signup?hostelId=${encodeURIComponent(hostelId)}${roomId ? `&roomId=${encodeURIComponent(roomId)}` : ''}${bedId ? `&bedId=${encodeURIComponent(bedId)}` : ''}${bedName ? `&bedName=${encodeURIComponent(bedName)}` : ''}`;

  // NOTE: Inside this template literal, \\d renders as \d in the browser (digit regex class) - correct!
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0"/>
  <title>Tenant Registration</title>
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
    .field{margin-bottom:13px;}
    .row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    lbl{display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;}
    .req{color:#EF4444;margin-left:2px;}
    input,select,textarea{width:100%;padding:12px 13px;border:1.5px solid #E2E8F0;border-radius:10px;font-size:15px;color:#1E293B;outline:none;transition:all .18s;background:#F8FAFC;font-family:inherit;}
    input:focus,select:focus,textarea:focus{border-color:#7C3AED;background:#fff;box-shadow:0 0 0 3px rgba(124,58,237,.1);}
    .ef input,.ef select,.ef textarea{border-color:#EF4444;background:#FEF2F2;}
    textarea{resize:vertical;min-height:76px;}
    .em{display:block;color:#EF4444;font-size:11px;margin-top:3px;font-weight:600;min-height:14px;}
    .btns{display:flex;gap:10px;margin-top:18px;}
    .btn{flex:1;padding:14px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;border:none;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:6px;}
    .bp{background:linear-gradient(135deg,#7C3AED,#5F2EEA);color:#fff;box-shadow:0 4px 14px rgba(124,58,237,.25);}
    .bp:hover{opacity:.9;}.bp:active{transform:scale(.98);}
    .bo{background:transparent;border:2px solid #E2E8F0;color:#475569;}
    .bo:hover{background:#F8FAFC;border-color:#CBD5E1;}
    .fw input[type=file]{position:absolute;width:1px;height:1px;opacity:0;}
    .fb{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border:2px dashed #C4B5FD;border-radius:10px;background:#FAF5FF;color:#7C3AED;font-size:13px;font-weight:700;cursor:pointer;transition:all .18s;margin-bottom:9px;}
    .fb.has{border-style:solid;border-color:#7C3AED;background:#F5F3FF;}
    #toast{position:fixed;top:14px;left:50%;transform:translateX(-50%) translateY(-110px);background:#EF4444;color:#fff;padding:11px 20px;border-radius:26px;font-size:13px;font-weight:700;box-shadow:0 6px 20px rgba(239,68,68,.3);transition:transform .4s cubic-bezier(.34,1.56,.64,1);z-index:1000;white-space:nowrap;max-width:90%;text-align:center;}
    #toast.show{transform:translateX(-50%) translateY(0);}
    #ldr{position:absolute;inset:0;background:rgba(255,255,255,.92);z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s;border-radius:24px;}
    #ldr.show{opacity:1;pointer-events:all;}
    .spin{width:40px;height:40px;border:4px solid #EDE9FE;border-top-color:#7C3AED;border-radius:50%;animation:sp .7s linear infinite;margin-bottom:12px;}
    @keyframes sp{to{transform:rotate(360deg)}}
    #ok{display:none;text-align:center;padding:40px 10px 20px;}
    .ck{width:80px;height:80px;background:#10B981;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin:0 auto 22px;color:#fff;font-size:38px;box-shadow:0 10px 28px rgba(16,185,129,.35);animation:pop .55s cubic-bezier(.34,1.56,.64,1);}
    @keyframes pop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.1)}to{transform:scale(1);opacity:1}}
    #ok h2{color:#0F172A;font-size:22px;margin:0 0 10px;font-weight:800;}
    #ok p{color:#64748B;font-size:14px;line-height:1.6;margin-bottom:24px;}
    .logo{width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,#7C3AED,#5F2EEA);display:inline-flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 4px 14px rgba(124,58,237,.28);margin-bottom:10px;}
  </style>
</head>
<body>
  <div id="toast">⚠️ <span id="tm">Error</span></div>
  <div class="card" id="mc">
    <div id="ldr"><div class="spin"></div><div style="color:#5B21B6;font-weight:700;font-size:15px;">Submitting...</div></div>
    <div id="fc">
      <div style="text-align:center;margin-bottom:12px;"><div class="logo">🏠</div></div>
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
          <div class="row2">
            <div class="field">
              <lbl>First Name<span class="req">*</span></lbl>
              <input id="first_name" name="first_name" placeholder="e.g. Ravi"/>
              <span class="em" id="e1"></span>
            </div>
            <div class="field">
              <lbl>Last Name</lbl>
              <input id="last_name" name="last_name" placeholder="e.g. Kumar"/>
            </div>
          </div>
          <div class="field">
            <lbl>Phone<span class="req">*</span></lbl>
            <input id="phone" name="phone" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number"/>
            <span class="em" id="e2"></span>
          </div>
          <div class="field">
            <lbl>Email Address</lbl>
            <input id="email" name="email" type="email" placeholder="your@email.com"/>
            <span class="em" id="e3"></span>
          </div>
          <div class="row2">
            <div class="field"><lbl>Date of Birth</lbl><input id="dob" name="date_of_birth" type="date"/></div>
            <div class="field">
              <lbl>Gender</lbl>
              <select id="gender" name="gender"><option value="">Select...</option><option>Male</option><option>Female</option><option>Other</option></select>
            </div>
          </div>
          <div class="field">
            <lbl>Permanent Address<span class="req">*</span></lbl>
            <textarea id="addr" name="permanent_address" placeholder="Full home address"></textarea>
            <span class="em" id="e4"></span>
          </div>
          <div class="btns"><button type="button" class="btn bp" id="b1">Next: Guardian Details ›</button></div>
        </div>

        <!-- STEP 2 -->
        <div class="step" id="p2">
          <p style="font-size:13px;color:#64748B;margin:0 0 14px;line-height:1.5;">Guardian details are optional but recommended.</p>
          <div class="field"><lbl>Guardian Name</lbl><input id="gname" name="guardian_name" placeholder="Parent / Guardian name"/></div>
          <div class="field">
            <lbl>Guardian Phone</lbl>
            <input id="gphone" name="guardian_phone" inputmode="numeric" maxlength="10" placeholder="10-digit number"/>
            <span class="em" id="e5"></span>
          </div>
          <div class="btns">
            <button type="button" class="btn bo" id="bk2">‹ Back</button>
            <button type="button" class="btn bp" id="b2">Next: Identity Docs ›</button>
          </div>
        </div>

        <!-- STEP 3 -->
        <div class="step" id="p3">
          <div class="field">
            <lbl>Aadhaar Number<span class="req">*</span></lbl>
            <input id="aadhaar" name="id_proof_number" inputmode="numeric" maxlength="12" placeholder="12-digit Aadhaar number"/>
            <span class="em" id="e6"></span>
          </div>
          <p style="font-size:12px;color:#64748B;margin:0 0 10px;">Upload clear Aadhaar photos (optional).</p>
          <div class="fw"><label class="fb" id="ffb" for="af"><span id="ffl">📷 Upload Aadhaar Front</span></label><input type="file" id="af" name="aadhaar_front" accept="image/*"/></div>
          <div class="fw"><label class="fb" id="bfb" for="ab"><span id="bfl">📷 Upload Aadhaar Back</span></label><input type="file" id="ab" name="aadhaar_back" accept="image/*"/></div>
          <div class="btns">
            <button type="button" class="btn bo" id="bk3">‹ Back</button>
            <button type="submit" class="btn bp" id="sub">✓ Submit Application</button>
          </div>
        </div>
      </form>
    </div>

    <div id="ok">
      <div class="ck">✓</div>
      <h2>Application Sent! 🎉</h2>
      <p>Your details have been submitted successfully. The owner will verify and activate your account in the app.</p>
      <button class="btn bp" onclick="window.location.reload()">Submit Another</button>
    </div>
  </div>

  <script>
    var cur = 1;
    function go(n) {
      cur = n;
      document.getElementById('prog').style.width = (n===1?0:n===2?50:100)+'%';
      for (var i = 1; i <= 3; i++) {
        var nav=document.getElementById('n'+i), circ=document.getElementById('c'+i);
        nav.className='stp'+(i===n?' active':i<n?' done':'');
        circ.innerHTML = i<n ? '&#10003;' : i;
      }
      var steps = document.querySelectorAll('.step');
      for (var j = 0; j < steps.length; j++) {
        steps[j].classList.remove('active');
      }
      document.getElementById('p'+n).classList.add('active');
      try{window.scrollTo({top:0,behavior:'smooth'});}catch(e){window.scrollTo(0,0);}
    }
    function setErr(el, inp, msg) {
      var e=document.getElementById(el), i=document.getElementById(inp);
      if(e) e.textContent=msg||'';
      if(i){ msg ? i.parentElement.classList.add('ef') : i.parentElement.classList.remove('ef'); }
    }
    function toast(msg){
      document.getElementById('tm').textContent=msg;
      var t=document.getElementById('toast'); t.classList.add('show');
      setTimeout(function(){t.classList.remove('show');},4000);
    }
    function val(id){ return (document.getElementById(id)||{}).value||''; }

    // Digits only
    var ids = ['phone','gphone','aadhaar'];
    for(var k=0; k<ids.length; k++){
      (function(id){
        var el=document.getElementById(id);
        if(el) el.addEventListener('input',function(e){ e.target.value=e.target.value.replace(/\D/g,''); });
      })(ids[k]);
    }

    // Step 1 next
    document.getElementById('b1').addEventListener('click',function(){
      var ok=true;
      if(!val('first_name').trim()){setErr('e1','first_name','First name is required');ok=false;}else{setErr('e1','first_name','');}
      var p = val('phone').trim();
      if(!/^[6-9]\d{9}$/.test(p)){setErr('e2','phone','Enter a valid 10-digit mobile number');ok=false;}else{setErr('e2','phone','');}
      var em = val('email').trim();
      if(em&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){setErr('e3','email','Enter a valid email');ok=false;}else{setErr('e3','email','');}
      if(!val('addr').trim()){setErr('e4','addr','Permanent address is required');ok=false;}else{setErr('e4','addr','');}
      if(!ok){toast('Please fix the errors to continue.');return;}
      go(2);
    });

    // Step 2
    document.getElementById('bk2').addEventListener('click',function(){go(1);});
    document.getElementById('b2').addEventListener('click',function(){
      var gp=val('gphone').trim();
      if(gp&&!/^\d{10}$/.test(gp)){setErr('e5','gphone','Enter a valid 10-digit number');toast('Please fix the errors to continue.');return;}
      setErr('e5','gphone',''); go(3);
    });

    // Step 3
    document.getElementById('bk3').addEventListener('click',function(){go(2);});

    // File inputs
    var cfgs = [{inp:'af',fb:'ffb',lbl:'ffl',side:'Front'},{inp:'ab',fb:'bfb',lbl:'bfl',side:'Back'}];
    for(var m=0; m<cfgs.length; m++){
      (function(cfg){
        var f=document.getElementById(cfg.inp),b=document.getElementById(cfg.fb),l=document.getElementById(cfg.lbl);
        if(f)f.addEventListener('change',function(){
          var has=f.files&&f.files.length;
          b.className='fb'+(has?' has':'');
          l.textContent=has?'✓ '+f.files[0].name:'📷 Upload Aadhaar '+cfg.side;
        });
      })(cfgs[m]);
    }

    // Submit
    document.getElementById('frm').addEventListener('submit',function(e){
      e.preventDefault();
      if(!/^\\d{12}$/.test(val('aadhaar').trim())){setErr('e6','aadhaar','Aadhaar must be exactly 12 digits');toast('Please fix the errors to submit.');return;}
      setErr('e6','aadhaar','');
      var sub=document.getElementById('sub'); sub.disabled=true;
      document.getElementById('ldr').classList.add('show');
      fetch('${postUrl}',{method:'POST',body:new FormData(this),headers:{'Accept':'application/json'}})
        .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
        .then(function(res){
          document.getElementById('ldr').classList.remove('show'); sub.disabled=false;
          if(res.ok&&res.d.success){document.getElementById('fc').style.display='none';document.getElementById('ok').style.display='block';}
          else{
            toast(res.d.error||'Registration failed. Please try again.');
            if((res.d.error||'').toLowerCase().indexOf('aadhaar')!==-1){setErr('e6','aadhaar',res.d.error);go(3);}
          }
        })
        .catch(function(){document.getElementById('ldr').classList.remove('show');sub.disabled=false;toast('Network error. Check your connection.');});
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
      gender:           gender || 'Other',
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
