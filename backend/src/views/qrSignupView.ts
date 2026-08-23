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
    hostelAddress,
    roomId,
    bedName,
    postUrl
  } = params;

  const roomBannerHtml = roomId
    ? `
      <div class="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 shadow-sm">
        <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
          <i data-lucide="door-open" class="w-5 h-5"></i>
        </div>
        <div class="min-w-0">
          <div class="text-[10px] font-black uppercase tracking-wider text-emerald-700">Pre-assigned Room & Bed</div>
          <div class="text-xs font-bold text-slate-800 mt-0.5">
            Room <span class="text-emerald-700 font-extrabold">${roomId}</span>
            ${bedName ? ` &nbsp;•&nbsp; Bed <span class="text-emerald-700 font-extrabold">${bedName}</span>` : ''}
          </div>
        </div>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"/>
  <title>${hostelName} - Student Registration | Hostix</title>
  
  <!-- Premium Modern Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Outfit:wght@500;600;700;800;900&display=swap" rel="stylesheet">
  
  <!-- Tailwind CSS & Lucide Icons & Canvas Confetti -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js"></script>

  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            display: ['"Outfit"', 'sans-serif'],
          },
          colors: {
            brand: {
              50: '#f5f3ff',
              100: '#ede9fe',
              200: '#ddd6fe',
              400: '#a78bfa',
              500: '#8b5cf6',
              600: '#6d4aff',
              700: '#5b39e0',
              800: '#4c1d95',
              900: '#2e1065',
              950: '#1e1b4b',
            }
          }
        }
      }
    }
  </script>

  <style>
    body {
      background-color: #0f172a;
      -webkit-tap-highlight-color: transparent;
      font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
    }
    .bg-gradient-mesh {
      background: radial-gradient(circle at 50% 0%, #2e1065 0%, #0f172a 75%, #090d16 100%);
    }
    .glass-header {
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .app-card {
      background: #ffffff;
      border: 1px solid #f1f5f9;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .custom-input {
      width: 100%;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 12px 14px;
      font-size: 14px;
      color: #0f172a;
      font-weight: 500;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
    }
    .custom-input:focus {
      background: #ffffff;
      border-color: #6d4aff;
      box-shadow: 0 0 0 4px rgba(109, 74, 255, 0.12);
    }
    .field-grp.has-error .custom-input {
      border-color: #ef4444 !important;
      background: #fef2f2 !important;
    }
    .step-pane {
      display: none;
    }
    .step-pane.active {
      display: block;
      animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .avatar-ring {
      background: linear-gradient(135deg, #6d4aff 0%, #a78bfa 100%);
      padding: 3px;
    }
    .doc-dropzone {
      border: 2px dashed #cbd5e1;
      transition: all 0.2s ease;
      background: #f8fafc;
    }
    .doc-dropzone.has-file {
      border-style: solid;
      border-color: #10b981;
      background: #f0fdf4;
    }
  </style>
</head>
<body class="min-h-screen bg-gradient-mesh text-slate-800 flex items-center justify-center p-3.5 sm:p-6 antialiased">

  <div class="w-full max-w-md mx-auto relative my-2">
    
    <!-- Top Branding Header -->
    <div class="text-center mb-5">
      <!-- Hostix Logo Pill -->
      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-header text-white text-xs font-black mb-3 shadow-lg shadow-black/20">
        <div class="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center text-white shadow-sm">
          <i data-lucide="building-2" class="w-3 h-3"></i>
        </div>
        <span class="tracking-wider uppercase font-display">HOSTIX RESIDENCE</span>
      </div>

      <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight font-display drop-shadow-sm">${hostelName}</h1>
      <p class="text-xs text-brand-200/80 mt-1.5 flex items-center justify-center gap-1.5 font-medium">
        <i data-lucide="map-pin" class="w-3.5 h-3.5 text-brand-400"></i> ${hostelAddress ? `${hostelAddress}, ` : ''}${hostelCity || 'Hyderabad'}
      </p>
    </div>

    <!-- Main Registration App Card -->
    <div class="app-card rounded-[28px] p-5 sm:p-7 relative overflow-hidden">
      
      ${roomBannerHtml}

      <!-- Step Navigation Stepper -->
      <div id="step-nav" class="relative flex items-center justify-between mb-7 px-4">
        <div class="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-slate-100 z-0 rounded-full"></div>
        <div id="bar-prog" class="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-brand-600 to-indigo-600 z-0 rounded-full transition-all duration-300" style="width: 0%;"></div>

        <!-- Node 1: Personal -->
        <div class="relative z-10 flex flex-col items-center gap-1.5 cursor-pointer" id="sn-1" onclick="setStep(1)">
          <div class="node-circle w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs bg-brand-600 text-white shadow-md shadow-brand-600/30 ring-4 ring-brand-50 transition-all">
            1
          </div>
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-brand-600 node-lbl">Personal</span>
        </div>

        <!-- Node 2: KYC -->
        <div class="relative z-10 flex flex-col items-center gap-1.5 cursor-pointer" id="sn-2">
          <div class="node-circle w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs bg-slate-100 text-slate-400 border border-slate-200 transition-all">
            2
          </div>
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 node-lbl">KYC & ID</span>
        </div>

        <!-- Node 3: Address -->
        <div class="relative z-10 flex flex-col items-center gap-1.5 cursor-pointer" id="sn-3">
          <div class="node-circle w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs bg-slate-100 text-slate-400 border border-slate-200 transition-all">
            3
          </div>
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 node-lbl">Address</span>
        </div>
      </div>

      <!-- Registration Form -->
      <form id="reg-form" enctype="multipart/form-data" novalidate>
        
        <!-- ═════════════════════════════════════════════════════════════════════
            STEP 1: PERSONAL PROFILE DETAILS (Add Student Match)
            ═════════════════════════════════════════════════════════════════════ -->
        <div id="pane-1" class="step-pane active space-y-4">
          <div class="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
            <div class="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <i data-lucide="user" class="w-4 h-4"></i>
            </div>
            <div>
              <h2 class="text-sm font-extrabold text-slate-900">Personal Information</h2>
              <p class="text-[11px] text-slate-500">Add tenant photo & primary contact</p>
            </div>
          </div>

          <!-- Profile Photo Avatar Uploader (AddStudent Match) -->
          <div class="flex items-center gap-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div class="relative w-16 h-16 rounded-full avatar-ring flex items-center justify-center shrink-0 shadow-sm">
              <div class="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center relative">
                <img id="prev-profile" src="" class="hidden w-full h-full object-cover"/>
                <div id="icon-profile-placeholder" class="flex flex-col items-center justify-center text-brand-600">
                  <i data-lucide="camera" class="w-5 h-5"></i>
                  <span class="text-[8px] font-bold mt-0.5">PHOTO</span>
                </div>
              </div>
              <!-- Camera Badge -->
              <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center border-2 border-white shadow-sm">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              </div>
              <input type="file" id="inp-profile" name="profile_photo" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"/>
            </div>

            <div class="flex-1 min-w-0">
              <div class="text-xs font-extrabold text-slate-800">Profile Photo <span class="text-[10px] font-normal text-slate-400">(Optional)</span></div>
              <div class="text-[11px] text-slate-500 mt-0.5 leading-tight">Tap avatar to take a selfie or upload from gallery</div>
              <button type="button" id="btn-clear-profile" class="hidden text-xs font-bold text-rose-500 hover:text-rose-700 mt-1">Remove photo</button>
            </div>
          </div>

          <!-- Name Fields -->
          <div class="grid grid-cols-2 gap-3">
            <div class="field-grp" id="fg-first_name">
              <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">First Name <span class="text-rose-500">*</span></label>
              <div class="relative">
                <i data-lucide="user" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" id="first_name" name="first_name" placeholder="e.g. Rahul" class="custom-input pl-10"/>
              </div>
              <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1 block"></span>
            </div>
            
            <div class="field-grp" id="fg-last_name">
              <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">Last Name</label>
              <input type="text" id="last_name" name="last_name" placeholder="e.g. Sharma" class="custom-input"/>
            </div>
          </div>

          <!-- Gender Pills -->
          <div class="field-grp" id="fg-gender">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">Gender <span class="text-rose-500">*</span></label>
            <div class="grid grid-cols-3 gap-2">
              <label class="cursor-pointer">
                <input type="radio" name="gender" value="Male" checked class="peer hidden"/>
                <div class="py-2.5 text-center rounded-xl border-1.5 border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 peer-checked:bg-brand-50 peer-checked:border-brand-600 peer-checked:text-brand-600 transition-all shadow-sm">
                  👨 Male
                </div>
              </label>
              <label class="cursor-pointer">
                <input type="radio" name="gender" value="Female" class="peer hidden"/>
                <div class="py-2.5 text-center rounded-xl border-1.5 border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 peer-checked:bg-brand-50 peer-checked:border-brand-600 peer-checked:text-brand-600 transition-all shadow-sm">
                  👩 Female
                </div>
              </label>
              <label class="cursor-pointer">
                <input type="radio" name="gender" value="Other" class="peer hidden"/>
                <div class="py-2.5 text-center rounded-xl border-1.5 border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 peer-checked:bg-brand-50 peer-checked:border-brand-600 peer-checked:text-brand-600 transition-all shadow-sm">
                  ⚧ Other
                </div>
              </label>
            </div>
          </div>

          <!-- Email Field -->
          <div class="field-grp" id="fg-email">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">Email Address <span class="text-rose-500">*</span></label>
            <div class="relative">
              <i data-lucide="mail" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="email" id="email" name="email" placeholder="name@example.com" class="custom-input pl-10"/>
            </div>
            <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1 block"></span>
          </div>

          <!-- Mobile Number with Real-time 6-9 validation -->
          <div class="field-grp" id="fg-phone">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">Mobile Number <span class="text-rose-500">*</span></label>
            <div class="relative">
              <div class="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold text-slate-600 font-mono pr-2 border-r border-slate-200">
                +91
              </div>
              <input type="tel" id="phone" name="phone" inputmode="numeric" maxlength="10" placeholder="98765 43210" class="custom-input pl-14 font-mono font-medium"/>
            </div>
            <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1 block"></span>
          </div>

          <!-- Date of Birth (Optional) -->
          <div class="field-grp" id="fg-dob">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">Date of Birth <span class="text-slate-400 font-normal">(Optional)</span></label>
            <div class="relative">
              <i data-lucide="calendar" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="date" id="dob" name="date_of_birth" class="custom-input pl-10"/>
            </div>
          </div>

          <div class="pt-2">
            <button type="button" id="btn-next-1" class="w-full py-3.5 px-5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-[0.99] transition-all">
              Continue to KYC & ID <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- ═════════════════════════════════════════════════════════════════════
            STEP 2: KYC & ID VERIFICATION (Add Student Match)
            ═════════════════════════════════════════════════════════════════════ -->
        <div id="pane-2" class="step-pane space-y-4">
          <div class="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
            <div class="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <i data-lucide="shield" class="w-4 h-4"></i>
            </div>
            <div>
              <h2 class="text-sm font-extrabold text-slate-900">Identity & KYC Verification</h2>
              <p class="text-[11px] text-slate-500">Select document & enter official ID number</p>
            </div>
          </div>

          <!-- ID Proof Type Selector -->
          <div class="field-grp" id="fg-id_type">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">Select ID Proof Type</label>
            <div class="relative">
              <i data-lucide="credit-card" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-600"></i>
              <select id="id_type" name="id_proof_type" class="custom-input pl-10 font-bold bg-slate-50">
                <option value="0">Select ID Proof (Optional)...</option>
                <option value="1">Aadhaar Card (12 digits)</option>
                <option value="2">PAN Card (10 chars)</option>
                <option value="3">Voter ID Card (10 chars)</option>
                <option value="4">Driving License (15-16 chars)</option>
                <option value="5">Passport (8 chars)</option>
              </select>
            </div>
          </div>

          <!-- CONDITIONAL ID SECTION: Visible only when ID is chosen -->
          <div id="id-conditional-wrap" class="hidden space-y-4 p-4 bg-slate-50/80 border border-slate-200 rounded-2xl">
            <div class="field-grp" id="fg-aadhaar">
              <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                <span id="id-type-label">ID Document</span> Number <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <i data-lucide="fingerprint" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" id="aadhaar" name="id_proof_number" placeholder="Enter ID number" class="custom-input pl-10 font-mono uppercase font-bold"/>
              </div>
              <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1 block"></span>
            </div>

            <!-- Front & Back Document Uploaders -->
            <div>
              <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                Document Photos <span class="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div class="grid grid-cols-2 gap-3">
                <!-- Front Side -->
                <div id="drop-f" class="doc-dropzone p-3.5 flex flex-col items-center justify-center text-center cursor-pointer relative min-h-[110px] rounded-2xl group">
                  <input type="file" id="af" name="id_proof_front" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"/>
                  <img id="prev-f" src="" class="hidden w-full h-20 object-cover rounded-xl mb-1 shadow-sm"/>
                  <div id="hold-f" class="flex flex-col items-center">
                    <div class="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform shadow-xs">
                      <i data-lucide="upload" class="w-4 h-4"></i>
                    </div>
                    <span id="lbl-f" class="text-xs font-bold text-slate-700">Upload Front</span>
                    <span class="text-[9px] text-slate-400">JPG, PNG</span>
                  </div>
                  <button type="button" id="clr-f" class="hidden absolute top-2 right-2 z-20 w-5 h-5 rounded-full bg-slate-900/80 text-white items-center justify-center hover:bg-slate-900 text-[10px]">✕</button>
                </div>

                <!-- Back Side -->
                <div id="drop-b" class="doc-dropzone p-3.5 flex flex-col items-center justify-center text-center cursor-pointer relative min-h-[110px] rounded-2xl group">
                  <input type="file" id="ab" name="id_proof_back" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"/>
                  <img id="prev-b" src="" class="hidden w-full h-20 object-cover rounded-xl mb-1 shadow-sm"/>
                  <div id="hold-b" class="flex flex-col items-center">
                    <div class="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform shadow-xs">
                      <i data-lucide="upload" class="w-4 h-4"></i>
                    </div>
                    <span id="lbl-b" class="text-xs font-bold text-slate-700">Upload Back</span>
                    <span class="text-[9px] text-slate-400">JPG, PNG</span>
                  </div>
                  <button type="button" id="clr-b" class="hidden absolute top-2 right-2 z-20 w-5 h-5 rounded-full bg-slate-900/80 text-white items-center justify-center hover:bg-slate-900 text-[10px]">✕</button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button type="button" id="btn-back-2" class="w-1/3 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all">
              Back
            </button>
            <button type="button" id="btn-next-2" class="w-2/3 py-3.5 px-5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-[0.99] transition-all">
              Address & Contacts <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- ═════════════════════════════════════════════════════════════════════
            STEP 3: ADDRESS & EMERGENCY DETAILS (Add Student Match)
            ═════════════════════════════════════════════════════════════════════ -->
        <div id="pane-3" class="step-pane space-y-4">
          <div class="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
            <div class="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <i data-lucide="map-pin" class="w-4 h-4"></i>
            </div>
            <div>
              <h2 class="text-sm font-extrabold text-slate-900">Address & Emergency</h2>
              <p class="text-[11px] text-slate-500">Guardian contacts & residential addresses</p>
            </div>
          </div>

          <!-- Guardian Name (Optional) -->
          <div class="field-grp" id="fg-gname">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
              Guardian / Parent Name <span class="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div class="relative">
              <i data-lucide="users" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="text" id="gname" name="guardian_name" placeholder="Parent / Guardian Name" class="custom-input pl-10"/>
            </div>
          </div>

          <!-- Guardian Phone (Mandatory) -->
          <div class="field-grp" id="fg-gphone">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">Guardian Phone Number <span class="text-rose-500">*</span></label>
            <div class="relative">
              <div class="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold text-slate-600 font-mono pr-2 border-r border-slate-200">
                +91
              </div>
              <input type="tel" id="gphone" name="guardian_phone" inputmode="numeric" maxlength="10" placeholder="98765 43210" class="custom-input pl-14 font-mono font-medium"/>
            </div>
            <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1 block"></span>
          </div>

          <!-- Current / Office Address (Mandatory) -->
          <div class="field-grp" id="fg-pres_addr">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">Current / Office Address <span class="text-rose-500">*</span></label>
            <textarea id="pres_addr" name="present_working_address" rows="2" placeholder="College / Company / Local area address" class="custom-input resize-none"></textarea>
            <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1 block"></span>
          </div>

          <!-- Same as Current Switch -->
          <div class="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span class="text-xs font-bold text-slate-700">Permanent address is same as current</span>
            <input type="checkbox" id="chk-same-addr" class="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"/>
          </div>

          <!-- Permanent Home Address (Mandatory) -->
          <div class="field-grp" id="fg-addr">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">Permanent Home Address <span class="text-rose-500">*</span></label>
            <textarea id="addr" name="permanent_address" rows="2" placeholder="House No, Native Village/Town, City, PIN" class="custom-input resize-none"></textarea>
            <span class="err-text hidden text-[10px] font-bold text-rose-500 mt-1 block"></span>
          </div>

          <div class="flex gap-3 pt-2">
            <button type="button" id="btn-back-3" class="w-1/3 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all">
              Back
            </button>
            <button type="submit" id="btn-sub" class="w-2/3 py-3.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-[0.99] transition-all">
              <i data-lucide="sparkles" class="w-4 h-4"></i> Submit Registration
            </button>
          </div>
        </div>
      </form>

      <!-- ═════════════════════════════════════════════════════════════════════
          CELEBRATION SUCCESS MODAL WITH CONFETTI (Payment Complete Style)
          ═════════════════════════════════════════════════════════════════════ -->
      <div id="pane-success" class="hidden text-center py-5">
        <!-- Glowing Checkmark -->
        <div class="w-20 h-20 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-100 shadow-inner">
          <i data-lucide="check-circle-2" class="w-12 h-12 text-emerald-600"></i>
        </div>

        <h2 class="text-2xl font-black text-slate-900 tracking-tight font-display mb-1">Registration Complete! 🎉</h2>
        <p class="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto mb-5">
          Your admission details have been submitted to <span class="font-extrabold text-slate-900">${hostelName}</span>.
        </p>

        <!-- Official Registration Reference Card -->
        <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left mb-5 space-y-2.5 shadow-sm">
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-500 font-medium">Applicant Name</span>
            <span id="succ-name" class="font-extrabold text-slate-900">Tenant</span>
          </div>

          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-500 font-medium">Registration Ref ID</span>
            <button type="button" id="btn-copy-ref" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-100 text-brand-700 font-mono font-black rounded-lg hover:bg-brand-200 transition">
              <span id="succ-ref">REG-HSTX-1001</span>
              <i data-lucide="copy" class="w-3 h-3"></i>
            </button>
          </div>

          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-500 font-medium">Status</span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full">
              <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Pending Owner Approval
            </span>
          </div>
        </div>

        <!-- Next Step Timeline Box -->
        <div class="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 text-left shadow-xl border border-indigo-900/50 mb-5 relative overflow-hidden">
          <div class="text-[10px] font-black uppercase tracking-widest text-brand-400 mb-1">What Happens Next?</div>
          <h3 class="text-xs font-bold text-white mb-1.5">Warden / Owner Verification</h3>
          <p class="text-[11px] text-slate-300 leading-relaxed">
            The hostel owner will verify your details and allocate your room/bed. You can show your Reference ID at the hostel reception desk.
          </p>
        </div>

        <button type="button" onclick="window.location.reload()" class="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-black transition">
          Done / New Registration
        </button>
      </div>

    </div>
    
    <!-- Footer Branding -->
    <div class="text-center mt-4">
      <p class="text-[11px] font-bold text-slate-400/80 flex items-center justify-center gap-1 uppercase tracking-wider font-display">
        <i data-lucide="shield-check" class="w-3.5 h-3.5 text-brand-400"></i> Powered by Hostix Smart Residence Platform
      </p>
    </div>
  </div>

  <!-- Fullscreen Loading Spinner -->
  <div id="loader-box" class="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center hidden">
    <div class="bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-3">
      <div class="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      <span class="text-xs font-black text-slate-800 uppercase tracking-wider">Submitting Application...</span>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast-el" class="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-xs w-11/12 transition-all duration-300 -translate-y-20 opacity-0 pointer-events-none">
    <div class="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-slate-800">
      <i data-lucide="alert-circle" class="w-4 h-4 text-amber-400 shrink-0"></i>
      <span id="toast-msg" class="text-xs font-bold leading-tight"></span>
    </div>
  </div>

  <!-- Client JavaScript -->
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

    function triggerConfetti() {
      if (window.confetti) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
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
          circle.className = 'node-circle w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs bg-emerald-500 text-white shadow-md shadow-emerald-500/20';
          circle.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i>';
          lbl.className = 'text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 node-lbl';
        } else if (i === s) {
          circle.className = 'node-circle w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs bg-brand-600 text-white ring-4 ring-brand-50 shadow-md shadow-brand-600/30';
          circle.innerHTML = String(i);
          lbl.className = 'text-[11px] font-extrabold uppercase tracking-wider text-brand-600 node-lbl';
        } else {
          circle.className = 'node-circle w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs bg-slate-100 text-slate-400 border border-slate-200';
          circle.innerHTML = String(i);
          lbl.className = 'text-[11px] font-extrabold uppercase tracking-wider text-slate-400 node-lbl';
        }
      }

      runIcons();
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) { window.scrollTo(0, 0); }
    }

    // Auto clear error on typing
    ['first_name', 'last_name', 'phone', 'email', 'gname', 'gphone', 'aadhaar', 'addr', 'pres_addr'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function() { setFieldError(id, ''); });
        el.addEventListener('change', function() { setFieldError(id, ''); });
      }
    });

    // Real-time Mobile Number Validation (6-9)
    var phoneInput = document.getElementById('phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', function() {
        this.value = this.value.replace(/\\D/g, '').slice(0, 10);
        if (this.value.length > 0) {
          var firstDigit = parseInt(this.value[0], 10);
          if (firstDigit < 6) {
            setFieldError('phone', 'Mobile number must start with 6, 7, 8, or 9');
          } else {
            setFieldError('phone', '');
          }
        }
      });
    }

    var gphoneInput = document.getElementById('gphone');
    if (gphoneInput) {
      gphoneInput.addEventListener('input', function() {
        this.value = this.value.replace(/\\D/g, '').slice(0, 10);
        if (this.value.length > 0) {
          var firstDigit = parseInt(this.value[0], 10);
          if (firstDigit < 6) {
            setFieldError('gphone', 'Guardian number must start with 6, 7, 8, or 9');
          } else {
            setFieldError('gphone', '');
          }
        }
      });
    }

    // Profile Photo Uploader
    var inpProfile = document.getElementById('inp-profile');
    var prevProfile = document.getElementById('prev-profile');
    var iconProfile = document.getElementById('icon-profile-placeholder');
    var btnClearProfile = document.getElementById('btn-clear-profile');
    if (inpProfile && prevProfile) {
      inpProfile.addEventListener('change', function() {
        if (inpProfile.files && inpProfile.files[0]) {
          var reader = new FileReader();
          reader.onload = function(e) {
            prevProfile.src = e.target.result;
            prevProfile.classList.remove('hidden');
            if (iconProfile) iconProfile.classList.add('hidden');
            if (btnClearProfile) btnClearProfile.classList.remove('hidden');
          };
          reader.readAsDataURL(inpProfile.files[0]);
        }
      });

      if (btnClearProfile) {
        btnClearProfile.addEventListener('click', function() {
          inpProfile.value = '';
          prevProfile.src = '';
          prevProfile.classList.add('hidden');
          if (iconProfile) iconProfile.classList.remove('hidden');
          btnClearProfile.classList.add('hidden');
        });
      }
    }

    // Conditional ID Proof Type Dropdown Handler
    var idTypeSelect = document.getElementById('id_type');
    var idCondWrap = document.getElementById('id-conditional-wrap');
    var idNumInput = document.getElementById('aadhaar');
    var idTypeLabel = document.getElementById('id-type-label');
    if (idTypeSelect && idCondWrap && idNumInput) {
      idTypeSelect.addEventListener('change', function(e) {
        var t = e.target.value;
        if (t === '0') {
          idCondWrap.classList.add('hidden');
          idNumInput.value = '';
          setFieldError('aadhaar', '');
        } else {
          idCondWrap.classList.remove('hidden');
          if (t === '1') {
            idTypeLabel.textContent = 'Aadhaar';
            idNumInput.maxLength = 12;
            idNumInput.placeholder = 'e.g. 3456 7890 1234 (12 digits)';
          } else if (t === '2') {
            idTypeLabel.textContent = 'PAN Card';
            idNumInput.maxLength = 10;
            idNumInput.placeholder = 'e.g. ABCDE1234F (10 chars)';
          } else if (t === '3') {
            idTypeLabel.textContent = 'Voter ID';
            idNumInput.maxLength = 10;
            idNumInput.placeholder = 'e.g. ABC1234567 (10 chars)';
          } else if (t === '4') {
            idTypeLabel.textContent = 'Driving License';
            idNumInput.maxLength = 16;
            idNumInput.placeholder = 'e.g. MH1420110062821 (15-16 chars)';
          } else if (t === '5') {
            idTypeLabel.textContent = 'Passport';
            idNumInput.maxLength = 8;
            idNumInput.placeholder = 'e.g. A1234567 (8 chars)';
          }
          setFieldError('aadhaar', '');
        }
      });

      idNumInput.addEventListener('input', function(e) {
        if (idTypeSelect.value === '1') {
          this.value = this.value.replace(/\\D/g, '');
        } else {
          this.value = this.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        }
      });
    }

    // Same as Current Address Checkbox
    var chkSameAddr = document.getElementById('chk-same-addr');
    var presAddrInput = document.getElementById('pres_addr');
    var permAddrInput = document.getElementById('addr');
    if (chkSameAddr && presAddrInput && permAddrInput) {
      chkSameAddr.addEventListener('change', function() {
        if (this.checked) {
          permAddrInput.value = presAddrInput.value;
          permAddrInput.setAttribute('readonly', 'true');
          permAddrInput.classList.add('bg-slate-100', 'text-slate-500');
          setFieldError('addr', '');
        } else {
          permAddrInput.removeAttribute('readonly');
          permAddrInput.classList.remove('bg-slate-100', 'text-slate-500');
        }
      });
      presAddrInput.addEventListener('input', function() {
        if (chkSameAddr.checked) {
          permAddrInput.value = this.value;
        }
      });
    }

    // Photo Dropzones Setup (Front / Back)
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
        setFieldError('phone', 'Must be a valid 10-digit number starting with 6, 7, 8, or 9.');
        valid = false;
      }

      var email = getVal('email');
      if (!email) {
        setFieldError('email', 'Email address is required.');
        valid = false;
      } else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        setFieldError('email', 'Enter a valid email address.');
        valid = false;
      }

      if (!valid) {
        showToast('Please fill all required personal fields.');
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

      var idType = getVal('id_type');
      var idNum = getVal('aadhaar');

      if (idType !== '0') {
        if (!idNum) {
          setFieldError('aadhaar', 'ID proof number is required.');
          valid = false;
        } else {
          if (idType === '1' && !/^\\d{12}$/.test(idNum)) {
            setFieldError('aadhaar', 'Aadhaar must be exactly 12 digits.');
            valid = false;
          } else if (idType === '2' && !/^[A-Z0-9]{10}$/.test(idNum)) {
            setFieldError('aadhaar', 'PAN must be exactly 10 characters.');
            valid = false;
          } else if (idType === '3' && !/^[A-Z0-9]{10}$/.test(idNum)) {
            setFieldError('aadhaar', 'Voter ID must be exactly 10 characters.');
            valid = false;
          } else if (idType === '4' && !/^[A-Z0-9]{15,16}$/.test(idNum)) {
            setFieldError('aadhaar', 'License must be 15-16 characters.');
            valid = false;
          } else if (idType === '5' && !/^[A-Z0-9]{8}$/.test(idNum)) {
            setFieldError('aadhaar', 'Passport must be exactly 8 characters.');
            valid = false;
          }
        }
      }

      if (!valid) {
        showToast('Please correct ID verification details.');
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

      var gphone = getVal('gphone').replace(/\\D/g, '').slice(-10);
      if (gphone.length !== 10 || !/^[6-9]\\d{9}$/.test(gphone)) {
        setFieldError('gphone', 'Guardian number must be a valid 10-digit number starting with 6, 7, 8, or 9.');
        valid = false;
      }

      var presAddr = getVal('pres_addr');
      if (!presAddr) {
        setFieldError('pres_addr', 'Current address is required.');
        valid = false;
      }

      var permAddr = getVal('addr');
      if (!permAddr) {
        setFieldError('addr', 'Permanent address is required.');
        valid = false;
      }

      if (!valid) {
        showToast('Please fill all mandatory fields.');
        return;
      }

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
            if (successPane) {
              successPane.classList.remove('hidden');
              if (res.data) {
                var nameEl = document.getElementById('succ-name');
                var refEl = document.getElementById('succ-ref');
                if (nameEl && res.data.student_name) nameEl.textContent = res.data.student_name;
                if (refEl && res.data.reference_id) refEl.textContent = res.data.reference_id;
              }
            }
            triggerConfetti();
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

    // Copy reference ID button
    var btnCopyRef = document.getElementById('btn-copy-ref');
    if (btnCopyRef) {
      btnCopyRef.addEventListener('click', function() {
        var refText = document.getElementById('succ-ref').textContent;
        navigator.clipboard.writeText(refText).then(function() {
          showToast('Reference ID copied to clipboard!');
        });
      });
    }

    // Initial icon render
    runIcons();
  </script>
</body>
</html>`;
}
