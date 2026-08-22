export interface QrSignupViewParams {
  hostelId: string | number;
  hostelName: string;
  hostelCity?: string;
  hostelAddress?: string;
  roomId?: string;
  bedId?: string;
  bedName?: string;
  postUrl: string;
}

export function renderQrSignupView(params: QrSignupViewParams): string {
  const {
    hostelName,
    hostelCity,
    roomId,
    bedName,
    postUrl
  } = params;

  const roomBannerHtml = roomId
    ? `
      <div class="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
          <i data-lucide="door-open" class="w-4 h-4"></i>
        </div>
        <div class="min-w-0">
          <div class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Pre-assigned Room</div>
          <div class="text-xs font-bold text-slate-800">
            Room <span class="text-emerald-700 font-black">${roomId}</span>
            ${bedName ? ` &nbsp;•&nbsp; Bed <span class="text-emerald-700 font-black">${bedName}</span>` : ''}
          </div>
        </div>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"/>
  <title>${hostelName} - Tenant Registration</title>
  
  <!-- Modern Font: Plus Jakarta Sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <!-- Tailwind CSS & Lucide Icons -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>

  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
          },
          colors: {
            brand: {
              50: '#f5f3ff',
              100: '#ede9fe',
              500: '#8b5cf6',
              600: '#7c3aed',
              700: '#6d28d9',
            }
          }
        }
      }
    }
  </script>

  <style>
    body {
      background: #f8fafc;
      -webkit-tap-highlight-color: transparent;
      font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
    }
    .main-card {
      background: #ffffff;
      border: 1px solid #f1f5f9;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05), 0 20px 25px -5px rgba(0, 0, 0, 0.02);
    }
    .custom-input {
      width: 100%;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 14px;
      color: #0f172a;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
    }
    .custom-input:focus {
      background: #ffffff;
      border-color: #7c3aed;
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
    }
    .has-error .custom-input {
      border-color: #ef4444 !important;
      background: #fef2f2 !important;
    }
    .has-error .err-text {
      display: block !important;
    }
    .step-pane {
      display: none;
    }
    .step-pane.active {
      display: block;
      animation: fadeIn 0.25s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .file-box {
      border: 1.5px dashed #cbd5e1;
      border-radius: 14px;
      background: #f8fafc;
      transition: all 0.2s ease;
    }
    .file-box:hover {
      border-color: #7c3aed;
      background: #faf5ff;
    }
    .file-box.has-file {
      border: 1.5px solid #7c3aed;
      background: #ffffff;
    }
  </style>
</head>
<body class="min-h-screen py-4 px-3 sm:px-6 flex flex-col justify-between font-sans text-slate-800 antialiased">

  <div class="max-w-md w-full mx-auto">
    <!-- Header Badge -->
    <div class="main-card rounded-2xl p-4 mb-3 relative overflow-hidden">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20 shrink-0">
          <i data-lucide="building" class="w-6 h-6"></i>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 mb-0.5">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-[10px] font-black uppercase tracking-wider text-violet-600">Digital Admission</span>
          </div>
          <h1 class="text-base font-extrabold text-slate-900 leading-tight truncate">${hostelName}</h1>
          ${hostelCity ? `<p class="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><i data-lucide="map-pin" class="w-3 h-3 text-slate-400"></i> ${hostelCity}</p>` : ''}
        </div>
      </div>
    </div>

    <!-- Main Registration Card -->
    <div class="main-card rounded-2xl p-5 sm:p-6 relative">
      
      ${roomBannerHtml}

      <!-- Step Indicator Bar -->
      <div id="step-nav" class="relative flex items-center justify-between mb-6 px-3">
        <div class="absolute left-7 right-7 top-1/2 -translate-y-1/2 h-1 bg-slate-100 z-0 rounded-full"></div>
        <div id="bar-prog" class="absolute left-7 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-violet-600 to-indigo-600 z-0 rounded-full transition-all duration-300" style="width: 0%;"></div>

        <!-- Node 1 -->
        <div class="relative z-10 flex flex-col items-center gap-1" id="sn-1">
          <div class="node-circle w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs bg-violet-600 text-white shadow-sm ring-4 ring-violet-50">
            1
          </div>
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-violet-600 node-lbl">Personal</span>
        </div>

        <!-- Node 2 -->
        <div class="relative z-10 flex flex-col items-center gap-1" id="sn-2">
          <div class="node-circle w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs bg-slate-100 text-slate-400 border border-slate-200">
            2
          </div>
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 node-lbl">Guardian</span>
        </div>

        <!-- Node 3 -->
        <div class="relative z-10 flex flex-col items-center gap-1" id="sn-3">
          <div class="node-circle w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs bg-slate-100 text-slate-400 border border-slate-200">
            3
          </div>
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 node-lbl">Identity</span>
        </div>
      </div>

      <!-- Registration Form -->
      <form id="reg-form" enctype="multipart/form-data" novalidate>
        
        <!-- STEP 1: Personal Details -->
        <div id="pane-1" class="step-pane active space-y-3.5">
          <div class="border-b border-slate-100 pb-2 mb-3">
            <h2 class="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <i data-lucide="user" class="w-4 h-4 text-violet-600"></i> Personal Information
            </h2>
            <p class="text-[11px] text-slate-500 mt-0.5">Enter tenant identity details</p>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div class="field-grp" id="fg-first_name">
              <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">First Name <span class="text-rose-500">*</span></label>
              <input type="text" id="first_name" name="first_name" placeholder="e.g. Ramesh" class="custom-input"/>
              <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1"></span>
            </div>
            
            <div class="field-grp" id="fg-last_name">
              <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">Last Name</label>
              <input type="text" id="last_name" name="last_name" placeholder="e.g. Kumar" class="custom-input"/>
            </div>
          </div>

          <div class="field-grp" id="fg-phone">
            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">Mobile Number <span class="text-rose-500">*</span></label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">+91</span>
              <input type="tel" id="phone" name="phone" inputmode="numeric" maxlength="10" placeholder="10-digit number" class="custom-input pl-11 font-mono font-medium"/>
            </div>
            <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1"></span>
          </div>

          <!-- MANDATORY EMAIL FIELD -->
          <div class="field-grp" id="fg-email">
            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">Email Address <span class="text-rose-500">*</span></label>
            <div class="relative">
              <i data-lucide="mail" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="email" id="email" name="email" placeholder="name@example.com" class="custom-input pl-9"/>
            </div>
            <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1"></span>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div class="field-grp" id="fg-dob">
              <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">Date of Birth <span class="text-rose-500">*</span></label>
              <input type="date" id="dob" name="date_of_birth" class="custom-input"/>
              <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1"></span>
            </div>

            <div class="field-grp" id="fg-gender">
              <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">Gender <span class="text-rose-500">*</span></label>
              <select id="gender" name="gender" class="custom-input bg-slate-50">
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1"></span>
            </div>
          </div>

          <div class="pt-2">
            <button type="button" id="btn-next-1" class="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md shadow-violet-500/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-[0.99] transition-all">
              Continue to Guardian <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- STEP 2: Guardian Details -->
        <div id="pane-2" class="step-pane space-y-3.5">
          <div class="border-b border-slate-100 pb-2 mb-3">
            <h2 class="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <i data-lucide="shield" class="w-4 h-4 text-violet-600"></i> Emergency Contact
            </h2>
            <p class="text-[11px] text-slate-500 mt-0.5">Parent or guardian contact details</p>
          </div>

          <div class="field-grp" id="fg-gname">
            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">Guardian Full Name <span class="text-rose-500">*</span></label>
            <input type="text" id="gname" name="guardian_name" placeholder="Parent / Guardian Name" class="custom-input"/>
            <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1"></span>
          </div>

          <div class="field-grp" id="fg-gphone">
            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">Guardian Phone Number <span class="text-rose-500">*</span></label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">+91</span>
              <input type="tel" id="gphone" name="guardian_phone" inputmode="numeric" maxlength="10" placeholder="10-digit number" class="custom-input pl-11 font-mono font-medium"/>
            </div>
            <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1"></span>
          </div>

          <div class="flex gap-2.5 pt-2">
            <button type="button" id="btn-back-2" class="w-1/3 py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all">
              Back
            </button>
            <button type="button" id="btn-next-2" class="w-2/3 py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md shadow-violet-500/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-[0.99] transition-all">
              Next: Identity <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- STEP 3: Identity & Address -->
        <div id="pane-3" class="step-pane space-y-3.5">
          <div class="border-b border-slate-100 pb-2 mb-3">
            <h2 class="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <i data-lucide="id-card" class="w-4 h-4 text-violet-600"></i> Identity & Address
            </h2>
            <p class="text-[11px] text-slate-500 mt-0.5">Government ID and residential address</p>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div class="field-grp" id="fg-id_type">
              <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">ID Document Type <span class="text-rose-500">*</span></label>
              <select id="id_type" name="id_proof_type" class="custom-input bg-slate-50">
                <option value="1">Aadhaar Card</option>
                <option value="2">PAN Card</option>
                <option value="3">Voter ID</option>
                <option value="4">Driving License</option>
                <option value="5">Passport</option>
              </select>
            </div>

            <div class="field-grp" id="fg-aadhaar">
              <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">ID Proof Number <span class="text-rose-500">*</span></label>
              <input type="text" id="aadhaar" name="id_proof_number" maxlength="12" placeholder="e.g. 123456789012" class="custom-input font-mono uppercase"/>
              <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1"></span>
            </div>
          </div>

          <!-- Document Upload Cards -->
          <div>
            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">ID Photos (Front & Back)</label>
            <div class="grid grid-cols-2 gap-2.5">
              <!-- Front Photo -->
              <div id="drop-f" class="file-box p-3 flex flex-col items-center justify-center text-center cursor-pointer relative min-h-[95px] rounded-xl group">
                <input type="file" id="af" name="aadhaar_front" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"/>
                <img id="prev-f" src="" class="hidden w-full h-16 object-cover rounded-lg mb-1 shadow-sm"/>
                <div id="hold-f" class="flex flex-col items-center">
                  <div class="w-7 h-7 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                    <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                  </div>
                  <span id="lbl-f" class="text-[11px] font-bold text-slate-700">Upload Front</span>
                </div>
                <button type="button" id="clr-f" class="hidden absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-slate-900/80 text-white items-center justify-center hover:bg-slate-900 text-[10px]">✕</button>
              </div>

              <!-- Back Photo -->
              <div id="drop-b" class="file-box p-3 flex flex-col items-center justify-center text-center cursor-pointer relative min-h-[95px] rounded-xl group">
                <input type="file" id="ab" name="aadhaar_back" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"/>
                <img id="prev-b" src="" class="hidden w-full h-16 object-cover rounded-lg mb-1 shadow-sm"/>
                <div id="hold-b" class="flex flex-col items-center">
                  <div class="w-7 h-7 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                    <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                  </div>
                  <span id="lbl-b" class="text-[11px] font-bold text-slate-700">Upload Back</span>
                </div>
                <button type="button" id="clr-b" class="hidden absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-slate-900/80 text-white items-center justify-center hover:bg-slate-900 text-[10px]">✕</button>
              </div>
            </div>
          </div>

          <div class="field-grp" id="fg-addr">
            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">Permanent Address <span class="text-rose-500">*</span></label>
            <textarea id="addr" name="permanent_address" rows="2" placeholder="House/Flat No, Street, City, State, PIN" class="custom-input resize-none"></textarea>
            <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1"></span>
          </div>

          <div class="field-grp" id="fg-pres_addr">
            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">Working / College Address</label>
            <textarea id="pres_addr" name="present_working_address" rows="2" placeholder="Company / College Name and Location" class="custom-input resize-none"></textarea>
          </div>

          <div class="flex gap-2.5 pt-2">
            <button type="button" id="btn-back-3" class="w-1/3 py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all">
              Back
            </button>
            <button type="submit" id="btn-sub" class="w-2/3 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider active:scale-[0.99] transition-all">
              <i data-lucide="check" class="w-4 h-4"></i> Submit Registration
            </button>
          </div>
        </div>
      </form>

      <!-- SUCCESS SCREEN WITH HOSTIX PLAY STORE APP PROMOTION -->
      <div id="pane-success" class="hidden text-center py-4">
        <!-- Success Icon -->
        <div class="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 ring-4 ring-emerald-100 shadow-inner">
          <i data-lucide="check-check" class="w-8 h-8"></i>
        </div>

        <h2 class="text-lg font-black text-slate-900 tracking-tight mb-1">Registration Submitted!</h2>
        <p class="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto mb-5">
          Your admission details have been submitted to <span class="font-bold text-slate-900">${hostelName}</span>.
        </p>

        <!-- PLAY STORE APP PROMOTION CARD -->
        <div class="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 text-left shadow-xl shadow-indigo-950/20 border border-indigo-900/50 mb-5 relative overflow-hidden">
          <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-violet-500/20 rounded-full blur-xl pointer-events-none"></div>
          
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-violet-400 border border-white/10 shrink-0">
              <i data-lucide="smartphone" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="text-[10px] font-black uppercase tracking-widest text-violet-400">Next Step: Tenant Portal</div>
              <h3 class="text-xs font-black text-white">Download the Hostix Mobile App</h3>
            </div>
          </div>

          <p class="text-[11px] text-slate-300 leading-relaxed mb-3">
            Track your monthly fee dues, download instant rent receipts, check daily food menus, and get hostel notices directly on your phone!
          </p>

          <div class="space-y-1.5 mb-3.5">
            <div class="flex items-center gap-2 text-[10.5px] font-semibold text-slate-200">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-400"></i> Check & Pay monthly fee bills
            </div>
            <div class="flex items-center gap-2 text-[10.5px] font-semibold text-slate-200">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-400"></i> Instant official payment receipts
            </div>
            <div class="flex items-center gap-2 text-[10.5px] font-semibold text-slate-200">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-400"></i> Mess food menu & meal skipping
            </div>
          </div>

          <!-- Play Store Download Button -->
          <a href="https://play.google.com/store/apps/details?id=com.hostix.app" target="_blank" class="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-[0.99]">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a2.38 2.38 0 0 1-.22-.387V2.2c.07-.137.144-.268.22-.386zm11.235 11.238l2.58 2.58-12.03 6.873 9.45-9.453zm2.58-2.58l-2.58 2.58-9.45-9.452 12.03 6.872zm1.05 1.05l2.84 1.623a1.47 1.47 0 0 1 0 2.56l-2.84 1.623-2.023-2.023 2.023-2.783z"/>
            </svg>
            Get Hostix on Google Play
          </a>
        </div>

        <button type="button" onclick="window.location.reload()" class="text-xs font-bold text-slate-500 hover:text-slate-800 transition">
          + Submit another registration
        </button>
      </div>

    </div>
    
    <!-- Footer Branding -->
    <div class="text-center mt-4">
      <p class="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1 uppercase tracking-wider">
        <i data-lucide="shield-check" class="w-3.5 h-3.5 text-violet-500"></i> Hostix Smart Hostel Management
      </p>
    </div>
  </div>

  <!-- Loading Overlay -->
  <div id="loader-box" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden">
    <div class="bg-white rounded-2xl p-5 shadow-2xl flex flex-col items-center gap-2.5">
      <div class="w-8 h-8 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
      <span class="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">Submitting Application...</span>
    </div>
  </div>

  <!-- Toast -->
  <div id="toast-el" class="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-xs w-11/12 transition-all duration-300 -translate-y-20 opacity-0 pointer-events-none">
    <div class="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 border border-slate-800">
      <i data-lucide="alert-circle" class="w-4 h-4 text-amber-400 shrink-0"></i>
      <span id="toast-msg" class="text-xs font-semibold leading-tight"></span>
    </div>
  </div>

  <!-- Client Script -->
  <script>
    function runIcons() {
      if (window.lucide) lucide.createIcons();
    }

    function showToast(msg) {
      var t = document.getElementById('toast-el');
      var m = document.getElementById('toast-msg');
      if (!t || !m) return;
      m.textContent = msg;
      t.classList.remove('-translate-y-20', 'opacity-0', 'pointer-events-none');
      t.classList.add('translate-y-0', 'opacity-100');
      setTimeout(function() {
        t.classList.add('-translate-y-20', 'opacity-0', 'pointer-events-none');
        t.classList.remove('translate-y-0', 'opacity-100');
      }, 3500);
    }

    function setFieldError(fieldId, errorMsg) {
      var grp = document.getElementById('fg-' + fieldId);
      if (!grp) return;
      var errSpan = grp.querySelector('.err-text');
      if (errorMsg) {
        grp.classList.add('has-error');
        if (errSpan) {
          errSpan.textContent = errorMsg;
          errSpan.classList.remove('hidden');
        }
      } else {
        grp.classList.remove('has-error');
        if (errSpan) {
          errSpan.textContent = '';
          errSpan.classList.add('hidden');
        }
      }
    }

    function clearAllErrors() {
      document.querySelectorAll('.field-grp').forEach(function(el) {
        el.classList.remove('has-error');
        var errSpan = el.querySelector('.err-text');
        if (errSpan) {
          errSpan.textContent = '';
          errSpan.classList.add('hidden');
        }
      });
    }

    function getVal(id) {
      var el = document.getElementById(id);
      return el ? el.value.trim() : '';
    }

    function setStep(s) {
      document.querySelectorAll('.step-pane').forEach(function(p) { p.classList.remove('active'); });
      var cur = document.getElementById('pane-' + s);
      if (cur) cur.classList.add('active');

      var prog = document.getElementById('bar-prog');
      if (prog) prog.style.width = s === 1 ? '0%' : s === 2 ? '50%' : '100%';

      for (var i = 1; i <= 3; i++) {
        var node = document.getElementById('sn-' + i);
        if (!node) continue;
        var circle = node.querySelector('.node-circle');
        var lbl = node.querySelector('.node-lbl');

        if (i < s) {
          circle.className = 'node-circle w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs bg-emerald-500 text-white shadow-sm';
          circle.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i>';
          lbl.className = 'text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 node-lbl';
        } else if (i === s) {
          circle.className = 'node-circle w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs bg-violet-600 text-white ring-4 ring-violet-50 shadow-sm';
          circle.innerHTML = String(i);
          lbl.className = 'text-[10px] font-extrabold uppercase tracking-wider text-violet-600 node-lbl';
        } else {
          circle.className = 'node-circle w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs bg-slate-100 text-slate-400 border border-slate-200';
          circle.innerHTML = String(i);
          lbl.className = 'text-[10px] font-extrabold uppercase tracking-wider text-slate-400 node-lbl';
        }
      }

      runIcons();
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) { window.scrollTo(0, 0); }
    }

    // Dynamic auto-clearing of error on typing
    ['first_name', 'last_name', 'phone', 'email', 'dob', 'gender', 'gname', 'gphone', 'aadhaar', 'addr'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function() { setFieldError(id, ''); });
        el.addEventListener('change', function() { setFieldError(id, ''); });
      }
    });

    // Auto-clean phone numbers to pure numeric 10-digits
    ['phone', 'gphone'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function() {
          this.value = this.value.replace(/\\D/g, '').slice(0, 10);
        });
      }
    });

    // Dynamic ID proof format handler
    var idTypeSelect = document.getElementById('id_type');
    var idNumInput = document.getElementById('aadhaar');
    if (idTypeSelect && idNumInput) {
      idTypeSelect.addEventListener('change', function(e) {
        var t = e.target.value;
        if (t === '1') {
          idNumInput.maxLength = 12;
          idNumInput.placeholder = 'e.g. 123456789012 (12 digits)';
        } else if (t === '2') {
          idNumInput.maxLength = 10;
          idNumInput.placeholder = 'e.g. ABCDE1234F (10 chars)';
        } else if (t === '3') {
          idNumInput.maxLength = 10;
          idNumInput.placeholder = 'e.g. ABC1234567 (10 chars)';
        } else if (t === '4') {
          idNumInput.maxLength = 15;
          idNumInput.placeholder = 'e.g. MH1420110062821 (15 chars)';
        } else if (t === '5') {
          idNumInput.maxLength = 8;
          idNumInput.placeholder = 'e.g. A1234567 (8 chars)';
        }
        idNumInput.value = '';
        setFieldError('aadhaar', '');
      });

      idNumInput.addEventListener('input', function(e) {
        if (idTypeSelect.value === '1') {
          this.value = this.value.replace(/\\D/g, '');
        } else {
          this.value = this.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        }
      });
    }

    // Photo Dropzones Setup
    function setupDropzone(fileInputId, dropId, prevId, holderId, labelId, clearId, labelTitle) {
      var inp = document.getElementById(fileInputId);
      var drop = document.getElementById(dropId);
      var prev = document.getElementById(prevId);
      var holder = document.getElementById(holderId);
      var lbl = document.getElementById(labelId);
      var clr = document.getElementById(clearId);
      if (!inp || !drop) return;

      inp.addEventListener('change', function() {
        if (inp.files && inp.files[0]) {
          var file = inp.files[0];
          var reader = new FileReader();
          reader.onload = function(e) {
            prev.src = e.target.result;
            prev.classList.remove('hidden');
            if (holder) holder.classList.add('hidden');
            drop.classList.add('has-file');
            if (lbl) lbl.textContent = 'Change ' + labelTitle;
            if (clr) clr.classList.remove('hidden');
          };
          reader.readAsDataURL(file);
        }
      });

      if (clr) {
        clr.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          inp.value = '';
          prev.src = '';
          prev.classList.add('hidden');
          if (holder) holder.classList.remove('hidden');
          drop.classList.remove('has-file');
          if (lbl) lbl.textContent = 'Upload ' + labelTitle;
          clr.classList.add('hidden');
        });
      }
    }
    setupDropzone('af', 'drop-f', 'prev-f', 'hold-f', 'lbl-f', 'clr-f', 'Front');
    setupDropzone('ab', 'drop-b', 'prev-b', 'hold-b', 'lbl-b', 'clr-b', 'Back');

    // ─── STEP 1 NEXT ────────────────────────────────────────────────────────────
    document.getElementById('btn-next-1').addEventListener('click', function() {
      clearAllErrors();
      var valid = true;

      var firstName = getVal('first_name');
      if (!firstName) {
        setFieldError('first_name', 'First name is required.');
        valid = false;
      }

      var phone = getVal('phone').replace(/\\D/g, '').slice(-10);
      if (phone.length !== 10 || !/^[6-9]\\d{9}$/.test(phone)) {
        setFieldError('phone', 'Enter a valid 10-digit number starting with 6-9.');
        valid = false;
      }

      // MANDATORY EMAIL VALIDATION
      var email = getVal('email');
      if (!email) {
        setFieldError('email', 'Email address is required.');
        valid = false;
      } else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        setFieldError('email', 'Enter a valid email address.');
        valid = false;
      }

      var dob = getVal('dob');
      if (!dob) {
        setFieldError('dob', 'Date of birth is required.');
        valid = false;
      }

      var gender = getVal('gender');
      if (!gender) {
        setFieldError('gender', 'Please select gender.');
        valid = false;
      }

      if (!valid) {
        showToast('Please fill all required fields.');
        return;
      }

      setStep(2);
    });

    // ─── STEP 2 BACK & NEXT ─────────────────────────────────────────────────────
    document.getElementById('btn-back-2').addEventListener('click', function() {
      setStep(1);
    });

    document.getElementById('btn-next-2').addEventListener('click', function() {
      clearAllErrors();
      var valid = true;

      var gname = getVal('gname');
      if (!gname) {
        setFieldError('gname', 'Guardian name is required.');
        valid = false;
      }

      var gphone = getVal('gphone').replace(/\\D/g, '').slice(-10);
      if (gphone.length !== 10 || !/^[6-9]\\d{9}$/.test(gphone)) {
        setFieldError('gphone', 'Enter a valid 10-digit guardian number.');
        valid = false;
      }

      if (!valid) {
        showToast('Guardian contact details are required.');
        return;
      }

      setStep(3);
    });

    // ─── STEP 3 BACK & SUBMIT ───────────────────────────────────────────────────
    document.getElementById('btn-back-3').addEventListener('click', function() {
      setStep(2);
    });

    document.getElementById('reg-form').addEventListener('submit', function(e) {
      e.preventDefault();
      clearAllErrors();
      var valid = true;

      var idNum = getVal('aadhaar');
      var idType = getVal('id_type');

      if (!idNum) {
        setFieldError('aadhaar', 'ID document number is required.');
        valid = false;
      } else {
        if (idType === '1' && !/^\\d{12}$/.test(idNum)) {
          setFieldError('aadhaar', 'Aadhaar must be 12 digits.');
          valid = false;
        } else if (idType === '2' && !/^[A-Z0-9]{10}$/.test(idNum)) {
          setFieldError('aadhaar', 'PAN must be 10 characters.');
          valid = false;
        } else if (idType === '3' && !/^[A-Z0-9]{10}$/.test(idNum)) {
          setFieldError('aadhaar', 'Voter ID must be 10 characters.');
          valid = false;
        } else if (idType === '4' && !/^[A-Z0-9]{15}$/.test(idNum)) {
          setFieldError('aadhaar', 'License must be 15 characters.');
          valid = false;
        } else if (idType === '5' && !/^[A-Z0-9]{8}$/.test(idNum)) {
          setFieldError('aadhaar', 'Passport must be 8 characters.');
          valid = false;
        }
      }

      var addr = getVal('addr');
      if (!addr) {
        setFieldError('addr', 'Permanent address is required.');
        valid = false;
      }

      if (!valid) {
        showToast('Please fill all mandatory fields.');
        return;
      }

      // Show loader
      var loader = document.getElementById('loader-box');
      if (loader) loader.classList.remove('hidden');

      var formData = new FormData(this);

      fetch('${postUrl}', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData
      })
        .then(function(r) {
          return r.json().catch(function() {
            return { success: false, error: 'Server error during submission.' };
          });
        })
        .then(function(res) {
          if (loader) loader.classList.add('hidden');
          if (res && res.success) {
            document.getElementById('reg-form').classList.add('hidden');
            document.getElementById('step-nav').classList.add('hidden');
            var successPane = document.getElementById('pane-success');
            if (successPane) successPane.classList.remove('hidden');
            runIcons();
          } else {
            showToast(res.error || 'Submission failed. Please check your details.');
          }
        })
        .catch(function(err) {
          if (loader) loader.classList.add('hidden');
          showToast('Failed to submit application. Please check connection.');
        });
    });

    // Initial icon render
    runIcons();
  </script>
</body>
</html>`;
}
