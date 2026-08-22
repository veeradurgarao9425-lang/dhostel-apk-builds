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
      <div class="mb-5 p-3.5 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl flex items-center gap-3 backdrop-blur-sm shadow-sm animate-fade-in">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
          <i data-lucide="door-open" class="w-5 h-5"></i>
        </div>
        <div>
          <div class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Pre-assigned Space</div>
          <div class="text-xs font-semibold text-emerald-950">
            Room <span class="font-black text-emerald-700 font-mono">${roomId}</span>
            ${bedName ? ` &nbsp;•&nbsp; Bed <span class="font-black text-emerald-700 font-mono">${bedName}</span>` : ''}
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
  
  <!-- Fonts -->
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
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
          },
          colors: {
            brand: {
              50: '#eef2ff',
              100: '#e0e7ff',
              500: '#6366f1',
              600: '#4f46e5',
              700: '#4338ca',
            }
          },
          animation: {
            'fade-in': 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          },
          keyframes: {
            fadeIn: {
              '0%': { opacity: '0' },
              '100%': { opacity: '1' }
            },
            slideUp: {
              '0%': { opacity: '0', transform: 'translateY(12px)' },
              '100%': { opacity: '1', transform: 'translateY(0)' }
            }
          }
        }
      }
    }
  </script>

  <style>
    body {
      background: radial-gradient(circle at top right, #f8faff 0%, #f1f5f9 100%);
      -webkit-tap-highlight-color: transparent;
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(226, 232, 240, 0.8);
      box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.07), 0 0 1px 1px rgba(15, 23, 42, 0.02);
    }
    .input-field {
      width: 100%;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 11px 15px;
      font-size: 14.5px;
      color: #0f172a;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
    }
    .input-field:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
    }
    .has-error .input-field {
      border-color: #ef4444 !important;
      background-color: #fffaf0;
    }
    .has-error .error-msg {
      display: block !important;
    }
    .step-section {
      display: none;
    }
    .step-section.active {
      display: block;
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .file-dropzone {
      border: 2px dashed #cbd5e1;
      border-radius: 16px;
      transition: all 0.2s ease;
      background: #f8fafc;
    }
    .file-dropzone:hover {
      border-color: #6366f1;
      background: #f5f7ff;
    }
    .file-dropzone.has-file {
      border: 1.5px solid #6366f1;
      background: #ffffff;
    }
  </style>
</head>
<body class="min-h-screen py-5 px-3.5 sm:px-6 flex flex-col justify-between font-sans text-slate-800 antialiased selection:bg-brand-500 selection:text-white">

  <div class="max-w-lg w-full mx-auto">
    <!-- Header Banner -->
    <div class="glass-card rounded-3xl p-5 mb-4 relative overflow-hidden">
      <div class="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-purple-400/10 rounded-full blur-2xl pointer-events-none"></div>
      
      <div class="flex items-center gap-4">
        <div class="w-13 h-13 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center p-3 shadow-lg shadow-brand-500/25 shrink-0">
          <i data-lucide="building-2" class="w-7 h-7"></i>
        </div>
        <div class="min-w-0">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-50 text-brand-600 mb-1 border border-brand-100/80">
            <span class="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
            Guest Registration
          </span>
          <h1 class="text-lg font-black text-slate-900 tracking-tight leading-tight truncate">${hostelName}</h1>
          ${hostelCity ? `<p class="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5"><i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i> ${hostelCity}</p>` : ''}
        </div>
      </div>
    </div>

    <!-- Main Registration Card -->
    <div class="glass-card rounded-3xl p-6 sm:p-7 relative shadow-xl shadow-slate-200/50">
      
      ${roomBannerHtml}

      <!-- Step Indicator -->
      <div class="relative flex items-center justify-between mb-8 px-2">
        <div class="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-slate-200/80 z-0 rounded-full"></div>
        <div id="step-bar" class="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-brand-600 to-indigo-500 z-0 rounded-full transition-all duration-500 ease-out" style="width: 0%;"></div>

        <!-- Step 1 -->
        <div class="relative z-10 flex flex-col items-center gap-1.5" id="step-node-1">
          <div class="step-circle w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 bg-brand-600 text-white ring-4 ring-brand-100 shadow-md">
            1
          </div>
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-brand-600 step-label">Personal</span>
        </div>

        <!-- Step 2 -->
        <div class="relative z-10 flex flex-col items-center gap-1.5" id="step-node-2">
          <div class="step-circle w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 bg-slate-100 text-slate-400 border border-slate-200">
            2
          </div>
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 step-label">Guardian</span>
        </div>

        <!-- Step 3 -->
        <div class="relative z-10 flex flex-col items-center gap-1.5" id="step-node-3">
          <div class="step-circle w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 bg-slate-100 text-slate-400 border border-slate-200">
            3
          </div>
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 step-label">Identity</span>
        </div>
      </div>

      <!-- Registration Form -->
      <form id="signup-form" enctype="multipart/form-data" novalidate>
        
        <!-- STEP 1: Personal Details -->
        <div id="step-1" class="step-section active space-y-4">
          <div class="border-b border-slate-100 pb-3 mb-4">
            <h2 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <i data-lucide="user" class="w-4 h-4 text-brand-600"></i> Personal Information
            </h2>
            <p class="text-xs text-slate-500 mt-0.5 font-medium">Please enter your basic legal identity details.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div class="form-group" id="grp-first_name">
              <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">First Name <span class="text-rose-500">*</span></label>
              <input type="text" id="first_name" name="first_name" placeholder="e.g. Ramesh" class="input-field" autocomplete="given-name"/>
              <span class="error-msg hidden text-[11px] font-semibold text-rose-500 mt-1"></span>
            </div>
            
            <div class="form-group" id="grp-last_name">
              <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Last Name</label>
              <input type="text" id="last_name" name="last_name" placeholder="e.g. Kumar" class="input-field" autocomplete="family-name"/>
            </div>
          </div>

          <div class="form-group" id="grp-phone">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Mobile Number <span class="text-rose-500">*</span></label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">+91</span>
              <input type="tel" id="phone" name="phone" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number" class="input-field pl-12 font-mono font-medium"/>
            </div>
            <span class="error-msg hidden text-[11px] font-semibold text-rose-500 mt-1"></span>
          </div>

          <!-- MANDATORY EMAIL -->
          <div class="form-group" id="grp-email">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Email Address <span class="text-rose-500">*</span></label>
            <div class="relative">
              <i data-lucide="mail" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
              <input type="email" id="email" name="email" placeholder="name@example.com" class="input-field pl-10" autocomplete="email"/>
            </div>
            <span class="error-msg hidden text-[11px] font-semibold text-rose-500 mt-1"></span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div class="form-group" id="grp-dob">
              <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Date of Birth <span class="text-rose-500">*</span></label>
              <input type="date" id="dob" name="date_of_birth" class="input-field"/>
              <span class="error-msg hidden text-[11px] font-semibold text-rose-500 mt-1"></span>
            </div>

            <div class="form-group" id="grp-gender">
              <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Gender <span class="text-rose-500">*</span></label>
              <select id="gender" name="gender" class="input-field bg-white">
                <option value="">Select Gender...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <span class="error-msg hidden text-[11px] font-semibold text-rose-500 mt-1"></span>
            </div>
          </div>

          <div class="pt-3">
            <button type="button" id="btn-next-1" class="w-full py-3.5 px-5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 active:scale-[0.99] transition-all text-sm">
              Continue to Guardian Details <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- STEP 2: Guardian Details -->
        <div id="step-2" class="step-section space-y-4">
          <div class="border-b border-slate-100 pb-3 mb-4">
            <h2 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <i data-lucide="shield-alert" class="w-4 h-4 text-brand-600"></i> Emergency Contact
            </h2>
            <p class="text-xs text-slate-500 mt-0.5 font-medium">Guardian contact info is strictly required for security.</p>
          </div>

          <div class="form-group" id="grp-gname">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Guardian / Parent Full Name <span class="text-rose-500">*</span></label>
            <input type="text" id="gname" name="guardian_name" placeholder="Full name of Parent/Guardian" class="input-field"/>
            <span class="error-msg hidden text-[11px] font-semibold text-rose-500 mt-1"></span>
          </div>

          <div class="form-group" id="grp-gphone">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Guardian Phone Number <span class="text-rose-500">*</span></label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">+91</span>
              <input type="tel" id="gphone" name="guardian_phone" inputmode="numeric" maxlength="10" placeholder="10-digit guardian number" class="input-field pl-12 font-mono font-medium"/>
            </div>
            <span class="error-msg hidden text-[11px] font-semibold text-rose-500 mt-1"></span>
          </div>

          <div class="flex gap-3 pt-3">
            <button type="button" id="btn-back-2" class="w-1/3 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all text-sm">
              Back
            </button>
            <button type="button" id="btn-next-2" class="w-2/3 py-3.5 px-5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 active:scale-[0.99] transition-all text-sm">
              Next: Verification <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- STEP 3: Identity & Address -->
        <div id="step-3" class="step-section space-y-4">
          <div class="border-b border-slate-100 pb-3 mb-4">
            <h2 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <i data-lucide="id-card" class="w-4 h-4 text-brand-600"></i> Identity Verification
            </h2>
            <p class="text-xs text-slate-500 mt-0.5 font-medium">Government ID and residential address verification.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div class="form-group" id="grp-id_type">
              <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">ID Document Type <span class="text-rose-500">*</span></label>
              <select id="id_type" name="id_proof_type" class="input-field bg-white">
                <option value="1">Aadhaar Card</option>
                <option value="2">PAN Card</option>
                <option value="3">Voter ID</option>
                <option value="4">Driving License</option>
                <option value="5">Passport</option>
              </select>
            </div>

            <div class="form-group" id="grp-aadhaar">
              <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">ID Proof Number <span class="text-rose-500">*</span></label>
              <input type="text" id="aadhaar" name="id_proof_number" maxlength="12" placeholder="e.g. 12-digit Aadhaar" class="input-field font-mono font-medium uppercase"/>
              <span class="error-msg hidden text-[11px] font-semibold text-rose-500 mt-1"></span>
            </div>
          </div>

          <!-- Document Upload Cards -->
          <div>
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-2">ID Document Photos (Optional)</label>
            <div class="grid grid-cols-2 gap-3">
              <!-- Front Photo -->
              <div id="drop-front" class="file-dropzone p-3.5 flex flex-col items-center justify-center text-center cursor-pointer relative min-h-[110px] rounded-2xl group">
                <input type="file" id="aadhaar_front" name="aadhaar_front" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"/>
                <img id="prev-front" src="" class="hidden w-full h-20 object-cover rounded-xl mb-1 shadow-sm"/>
                <div id="holder-front" class="flex flex-col items-center">
                  <div class="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                    <i data-lucide="camera" class="w-4 h-4"></i>
                  </div>
                  <span id="lbl-front" class="text-xs font-bold text-slate-700">Upload Front</span>
                  <span class="text-[10px] text-slate-400 font-medium mt-0.5">JPG, PNG up to 5MB</span>
                </div>
                <button type="button" id="clear-front" class="hidden absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-slate-900/80 text-white items-center justify-center hover:bg-slate-900 shadow">
                  <i data-lucide="x" class="w-3 h-3"></i>
                </button>
              </div>

              <!-- Back Photo -->
              <div id="drop-back" class="file-dropzone p-3.5 flex flex-col items-center justify-center text-center cursor-pointer relative min-h-[110px] rounded-2xl group">
                <input type="file" id="aadhaar_back" name="aadhaar_back" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"/>
                <img id="prev-back" src="" class="hidden w-full h-20 object-cover rounded-xl mb-1 shadow-sm"/>
                <div id="holder-back" class="flex flex-col items-center">
                  <div class="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                    <i data-lucide="camera" class="w-4 h-4"></i>
                  </div>
                  <span id="lbl-back" class="text-xs font-bold text-slate-700">Upload Back</span>
                  <span class="text-[10px] text-slate-400 font-medium mt-0.5">JPG, PNG up to 5MB</span>
                </div>
                <button type="button" id="clear-back" class="hidden absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-slate-900/80 text-white items-center justify-center hover:bg-slate-900 shadow">
                  <i data-lucide="x" class="w-3 h-3"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="form-group" id="grp-addr">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Permanent Residential Address <span class="text-rose-500">*</span></label>
            <textarea id="addr" name="permanent_address" rows="2" placeholder="House/Flat No, Street, City, State, PIN code" class="input-field resize-none"></textarea>
            <span class="error-msg hidden text-[11px] font-semibold text-rose-500 mt-1"></span>
          </div>

          <div class="form-group" id="grp-pres-addr">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Working / College Address</label>
            <textarea id="pres_addr" name="present_working_address" rows="2" placeholder="Company / College name and location" class="input-field resize-none"></textarea>
          </div>

          <div class="flex gap-3 pt-3">
            <button type="button" id="btn-back-3" class="w-1/3 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all text-sm">
              Back
            </button>
            <button type="submit" id="btn-submit" class="w-2/3 py-3.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-[0.99] transition-all text-sm">
              <i data-lucide="check-circle-2" class="w-4 h-4"></i> Submit Registration
            </button>
          </div>
        </div>
      </form>

      <!-- Success Screen -->
      <div id="success-screen" class="hidden text-center py-6 animate-fade-in">
        <div class="w-18 h-18 mx-auto rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-100 shadow-inner">
          <i data-lucide="check-check" class="w-9 h-9"></i>
        </div>
        <h2 class="text-xl font-black text-slate-900 tracking-tight mb-2">Registration Submitted!</h2>
        <p class="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto mb-6">
          Your admission details have been submitted to <span class="font-bold text-slate-900">${hostelName}</span>. The hostel owner will verify your details and allocate your room.
        </p>

        <div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left max-w-sm mx-auto space-y-2 mb-6">
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <i data-lucide="badge-check" class="w-4 h-4 text-emerald-500"></i> KYC documents under review
          </div>
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <i data-lucide="bell" class="w-4 h-4 text-brand-500"></i> You will receive an SMS & Email notification once approved
          </div>
        </div>

        <button type="button" onclick="window.location.reload()" class="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow">
          <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Register Another Tenant
        </button>
      </div>

    </div>
    
    <!-- Footer Branding -->
    <div class="text-center mt-5">
      <p class="text-[11px] font-bold text-slate-400 flex items-center justify-center gap-1.5 tracking-wide uppercase">
        <i data-lucide="sparkles" class="w-3.5 h-3.5 text-brand-500"></i> Powered by Hostix PMS
      </p>
    </div>
  </div>

  <!-- Loading Modal Overlay -->
  <div id="loader-overlay" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden">
    <div class="bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-3 animate-slide-up">
      <div class="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      <span class="text-xs font-black text-slate-800 uppercase tracking-wider">Submitting Application...</span>
    </div>
  </div>

  <!-- Toast Container -->
  <div id="toast-box" class="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-sm w-11/12 transition-all duration-300 -translate-y-24 opacity-0 pointer-events-none">
    <div class="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700">
      <i data-lucide="alert-circle" class="w-4 h-4 text-amber-400 shrink-0"></i>
      <span id="toast-text" class="text-xs font-semibold leading-tight"></span>
    </div>
  </div>

  <!-- Interactive JavaScript Logic -->
  <script>
    // State
    var currentStep = 1;

    function initIcons() {
      if (window.lucide) {
        lucide.createIcons();
      }
    }

    function showToast(msg) {
      var box = document.getElementById('toast-box');
      var txt = document.getElementById('toast-text');
      if (!box || !txt) return;
      txt.textContent = msg;
      box.classList.remove('-translate-y-24', 'opacity-0', 'pointer-events-none');
      box.classList.add('translate-y-0', 'opacity-100');
      setTimeout(function() {
        box.classList.add('-translate-y-24', 'opacity-0', 'pointer-events-none');
        box.classList.remove('translate-y-0', 'opacity-100');
      }, 3500);
    }

    function setFieldError(fieldId, errorMsg) {
      var grp = document.getElementById('grp-' + fieldId);
      if (!grp) return;
      var errSpan = grp.querySelector('.error-msg');
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
      document.querySelectorAll('.form-group').forEach(function(el) {
        el.classList.remove('has-error');
        var errSpan = el.querySelector('.error-msg');
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

    function goToStep(step) {
      currentStep = step;
      document.querySelectorAll('.step-section').forEach(function(sec) {
        sec.classList.remove('active');
      });
      var activeSec = document.getElementById('step-' + step);
      if (activeSec) activeSec.classList.add('active');

      // Update progress bar
      var bar = document.getElementById('step-bar');
      if (bar) {
        bar.style.width = step === 1 ? '0%' : step === 2 ? '50%' : '100%';
      }

      // Update nodes
      for (var i = 1; i <= 3; i++) {
        var node = document.getElementById('step-node-' + i);
        if (!node) continue;
        var circle = node.querySelector('.step-circle');
        var label = node.querySelector('.step-label');

        if (i < step) {
          // Completed
          circle.className = 'step-circle w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs bg-emerald-500 text-white shadow-sm';
          circle.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i>';
          label.className = 'text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 step-label';
        } else if (i === step) {
          // Active
          circle.className = 'step-circle w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs bg-brand-600 text-white ring-4 ring-brand-100 shadow-md';
          circle.innerHTML = String(i);
          label.className = 'text-[11px] font-extrabold uppercase tracking-wider text-brand-600 step-label';
        } else {
          // Pending
          circle.className = 'step-circle w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs bg-slate-100 text-slate-400 border border-slate-200';
          circle.innerHTML = String(i);
          label.className = 'text-[11px] font-extrabold uppercase tracking-wider text-slate-400 step-label';
        }
      }

      initIcons();
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) { window.scrollTo(0, 0); }
    }

    // Dynamic auto-clearing of error on typing
    ['first_name', 'last_name', 'phone', 'email', 'dob', 'gender', 'gname', 'gphone', 'aadhaar', 'addr'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function() {
          setFieldError(id, '');
        });
        el.addEventListener('change', function() {
          setFieldError(id, '');
        });
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
    setupDropzone('aadhaar_front', 'drop-front', 'prev-front', 'holder-front', 'lbl-front', 'clear-front', 'Front');
    setupDropzone('aadhaar_back', 'drop-back', 'prev-back', 'holder-back', 'lbl-back', 'clear-back', 'Back');

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
        setFieldError('phone', 'Enter a valid 10-digit mobile number starting with 6-9.');
        valid = false;
      }

      // MANDATORY EMAIL VALIDATION
      var email = getVal('email');
      if (!email) {
        setFieldError('email', 'Email address is required.');
        valid = false;
      } else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        setFieldError('email', 'Please enter a valid email address.');
        valid = false;
      }

      var dob = getVal('dob');
      if (!dob) {
        setFieldError('dob', 'Date of birth is required.');
        valid = false;
      }

      var gender = getVal('gender');
      if (!gender) {
        setFieldError('gender', 'Please select your gender.');
        valid = false;
      }

      if (!valid) {
        showToast('Please fill in all mandatory fields.');
        return;
      }

      goToStep(2);
    });

    // ─── STEP 2 BACK & NEXT ─────────────────────────────────────────────────────
    document.getElementById('btn-back-2').addEventListener('click', function() {
      goToStep(1);
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
        setFieldError('gphone', 'Enter a valid 10-digit guardian number starting with 6-9.');
        valid = false;
      }

      if (!valid) {
        showToast('Guardian contact details are required.');
        return;
      }

      goToStep(3);
    });

    // ─── STEP 3 BACK & SUBMIT ───────────────────────────────────────────────────
    document.getElementById('btn-back-3').addEventListener('click', function() {
      goToStep(2);
    });

    document.getElementById('signup-form').addEventListener('submit', function(e) {
      e.preventDefault();
      clearAllErrors();
      var valid = true;

      var idNum = getVal('aadhaar');
      var idType = getVal('id_type');

      if (!idNum) {
        setFieldError('aadhaar', 'ID Document number is required.');
        valid = false;
      } else {
        if (idType === '1' && !/^\\d{12}$/.test(idNum)) {
          setFieldError('aadhaar', 'Aadhaar must be exactly 12 numeric digits.');
          valid = false;
        } else if (idType === '2' && !/^[A-Z0-9]{10}$/.test(idNum)) {
          setFieldError('aadhaar', 'PAN must be exactly 10 alphanumeric characters.');
          valid = false;
        } else if (idType === '3' && !/^[A-Z0-9]{10}$/.test(idNum)) {
          setFieldError('aadhaar', 'Voter ID must be exactly 10 characters.');
          valid = false;
        } else if (idType === '4' && !/^[A-Z0-9]{15}$/.test(idNum)) {
          setFieldError('aadhaar', 'Driving License must be exactly 15 characters.');
          valid = false;
        } else if (idType === '5' && !/^[A-Z0-9]{8}$/.test(idNum)) {
          setFieldError('aadhaar', 'Passport must be exactly 8 characters.');
          valid = false;
        }
      }

      var addr = getVal('addr');
      if (!addr) {
        setFieldError('addr', 'Permanent address is required.');
        valid = false;
      }

      if (!valid) {
        showToast('Please complete identity verification details.');
        return;
      }

      // Show loader
      var loader = document.getElementById('loader-overlay');
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
            document.getElementById('signup-form').classList.add('hidden');
            var successScreen = document.getElementById('success-screen');
            if (successScreen) successScreen.classList.remove('hidden');
            initIcons();
          } else {
            showToast(res.error || 'Submission failed. Please check your details.');
          }
        })
        .catch(function(err) {
          if (loader) loader.classList.add('hidden');
          showToast('Failed to submit application. Please check your connection.');
        });
    });

    // Initial icon render
    initIcons();
  </script>
</body>
</html>`;
}
