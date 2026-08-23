import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, Upload, MapPin, ArrowRight, ArrowLeft,
  Check, Copy, ShieldCheck, UserCheck, Calendar,
  Building2, Sparkles, AlertCircle
} from 'lucide-react';
import './index.css';

// ─── URL param helpers ────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const HOSTEL_ID = params.get('hostelId') || '';
const ROOM_ID   = params.get('roomId')   || '';
const BED_ID    = params.get('bedId')    || '';
const BED_NAME  = params.get('bedName')  || '';
const FORM_TYPE = params.get('type')     || 'student';
const IS_GUEST  = FORM_TYPE === 'guest';

// Detect backend base URL
const API_BASE = `${window.location.protocol}//${window.location.host}/api`;

const ID_TYPES = [
  { id: 1, label: 'Aadhaar Card',    maxLen: 12, hint: 'Enter 12-digit Aadhaar number' },
  { id: 2, label: 'PAN Card',        maxLen: 10, hint: 'Enter 10-character PAN number' },
  { id: 3, label: 'Voter ID',        maxLen: 10, hint: 'Enter 10-character Voter ID' },
  { id: 4, label: 'Driving License', maxLen: 16, hint: 'Enter Driving License number' },
  { id: 5, label: 'Passport',        maxLen: 8,  hint: 'Enter Passport number' },
];

const GUEST_PURPOSES = [
  'Exam / Test',
  'Job Interview',
  'Business / Work',
  'Tourism / Sightseeing',
  'Transit / Short Stay',
  'Family / Friend Visit',
  'Other',
];

interface HostelInfo { hostel_name: string; city?: string; address?: string; }
interface SubmittedData {
  reference_id: string;
  student_name: string;
  hostel_name: string;
  phone: string;
  email: string;
  submitted_at: string;
}

let _toastTimer: ReturnType<typeof setTimeout>;
function showToast(msg: string) {
  const el = document.getElementById('toast-el');
  const msgEl = document.getElementById('toast-msg');
  if (!el || !msgEl) return;
  msgEl.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

export default function App() {
  const [step, setStep]             = useState(1);
  const [hostelInfo, setHostelInfo] = useState<HostelInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState<SubmittedData | null>(null);
  const [copied, setCopied]         = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  // Common Personal State
  const [profileUri, setProfileUri]   = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [fullName, setFullName]       = useState('');
  const [gender, setGender]           = useState('Male');
  const [phone, setPhone]             = useState('');
  const [email, setEmail]             = useState('');
  const [dob, setDob]                 = useState('');

  // Guest Specific State
  const [purpose, setPurpose]         = useState('Exam / Test');
  const [checkInDate, setCheckInDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [days, setDays]               = useState(1);
  const [guestNotes, setGuestNotes]   = useState('');

  // KYC
  const [idTypeId, setIdTypeId]       = useState(1);
  const [idNumber, setIdNumber]       = useState('');
  const [frontUri, setFrontUri]       = useState<string | null>(null);
  const [frontFile, setFrontFile]     = useState<File | null>(null);
  const [backUri, setBackUri]         = useState<string | null>(null);
  const [backFile, setBackFile]       = useState<File | null>(null);

  // Student Step 3: Address
  const [guardianName, setGuardianName]   = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [currentAddr, setCurrentAddr]     = useState('');
  const [permAddr, setPermAddr]           = useState('');
  const [sameAddr, setSameAddr]           = useState(false);

  const profileInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef   = useRef<HTMLInputElement>(null);
  const backInputRef    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!HOSTEL_ID) return;
    fetch(`${API_BASE}/public/hostel-info?hostelId=${encodeURIComponent(HOSTEL_ID)}`)
      .then(r => r.json())
      .then(d => { if (d.success && d.data) setHostelInfo(d.data); })
      .catch(() => {});
  }, []);

  const handlePhone = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 10);
    setPhone(d);
    if (d.length > 0 && parseInt(d[0]) < 6) {
      setErrors(p => ({ ...p, phone: 'Must start with 6, 7, 8 or 9' }));
    } else {
      setErrors(p => { const n = { ...p }; delete n.phone; return n; });
    }
  };

  const handleGuardianPhone = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 10);
    setGuardianPhone(d);
    if (d.length > 0 && parseInt(d[0]) < 6) {
      setErrors(p => ({ ...p, guardianPhone: 'Must start with 6, 7, 8 or 9' }));
    } else {
      setErrors(p => { const n = { ...p }; delete n.guardianPhone; return n; });
    }
  };

  const handleIdNumber = (val: string) => {
    const selected = ID_TYPES.find(t => t.id === idTypeId);
    let cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (selected?.id === 1) cleaned = cleaned.replace(/\D/g, '');
    if (selected && cleaned.length > selected.maxLen) cleaned = cleaned.slice(0, selected.maxLen);
    setIdNumber(cleaned);
    setErrors(p => { const n = { ...p }; delete n.idNumber; return n; });
  };

  const onProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { showToast('Profile photo must be under 5MB'); return; }
    setProfileFile(f);
    setProfileUri(URL.createObjectURL(f));
  };

  const onFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { showToast('ID Front photo must be under 5MB'); return; }
    setFrontFile(f);
    setFrontUri(URL.createObjectURL(f));
    setErrors(p => { const n = { ...p }; delete n.front; return n; });
  };

  const onBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { showToast('ID Back photo must be under 5MB'); return; }
    setBackFile(f);
    setBackUri(URL.createObjectURL(f));
    setErrors(p => { const n = { ...p }; delete n.back; return n; });
  };

  const validateStep1 = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'First name is required';
    if (!phone) errs.phone = 'Mobile number is required';
    else if (phone.length !== 10) errs.phone = 'Enter valid 10-digit mobile number';
    else if (parseInt(phone[0]) < 6) errs.phone = 'Must start with 6, 7, 8 or 9';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email address';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [firstName, phone, email]);

  const validateStep2 = useCallback(() => {
    const errs: Record<string, string> = {};
    const selected = ID_TYPES.find(t => t.id === idTypeId);
    if (!idNumber.trim()) {
      errs.idNumber = `${selected?.label || 'ID'} number is required`;
    } else if (selected?.id === 1 && idNumber.length !== 12) {
      errs.idNumber = 'Aadhaar must be exactly 12 digits';
    } else if (selected?.id === 2 && idNumber.length !== 10) {
      errs.idNumber = 'PAN must be exactly 10 characters';
    }
    if (!frontFile) errs.front = 'Front photo is required';
    if (!backFile)  errs.back  = 'Back photo is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [idTypeId, idNumber, frontFile, backFile]);

  const validateStep3 = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!guardianName.trim()) errs.guardianName = 'Guardian name is required';
    if (!guardianPhone) errs.guardianPhone = 'Guardian phone is required';
    else if (guardianPhone.length !== 10) errs.guardianPhone = 'Enter valid 10-digit number';
    if (!permAddr.trim()) errs.permAddr = 'Permanent address is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [guardianName, guardianPhone, permAddr]);

  // ── Submit Student Admission ──
  const handleSubmitStudent = async () => {
    if (!validateStep3()) { showToast('Please fix the errors in the form'); return; }
    if (!HOSTEL_ID) { showToast('Missing hostel information'); return; }

    setSubmitting(true);
    const fd = new FormData();
    fd.append('hostel_id', HOSTEL_ID);
    fd.append('first_name', firstName.trim());
    fd.append('last_name', lastName.trim());
    fd.append('gender', gender);
    fd.append('email', email.trim());
    fd.append('phone', phone);
    if (dob) fd.append('date_of_birth', dob);
    fd.append('guardian_name', guardianName.trim());
    fd.append('guardian_phone', guardianPhone);
    fd.append('present_working_address', currentAddr.trim());
    fd.append('current_address', currentAddr.trim());
    fd.append('permanent_address', permAddr.trim());
    fd.append('id_proof_type', String(idTypeId));
    fd.append('id_proof_number', idNumber.trim());
    if (profileFile) fd.append('profile_photo', profileFile);
    if (frontFile)   fd.append('id_proof_front', frontFile);
    if (backFile)    fd.append('id_proof_back', backFile);
    if (ROOM_ID) fd.append('room_id', ROOM_ID);
    if (BED_ID)  fd.append('bed_id', BED_ID);

    let url = `${API_BASE}/public/qr-signup?hostelId=${encodeURIComponent(HOSTEL_ID)}`;
    if (ROOM_ID) url += `&roomId=${encodeURIComponent(ROOM_ID)}`;
    if (BED_ID)  url += `&bedId=${encodeURIComponent(BED_ID)}`;
    if (BED_NAME) url += `&bedName=${encodeURIComponent(BED_NAME)}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

        setSubmitted({
          reference_id: data.data?.reference_id || `REG-${Date.now()}`,
          student_name: data.data?.student_name || `${firstName} ${lastName}`.trim(),
          hostel_name:  data.data?.hostel_name  || hostelInfo?.hostel_name || 'Hostix PG',
          phone: phone,
          email: email,
          submitted_at: formattedDate,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        showToast(data.error || 'Registration failed. Please try again.');
      }
    } catch {
      showToast('Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submit Guest Self Check-In ──
  const handleSubmitGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    if (!phone || phone.length !== 10) errs.phone = '10-digit mobile number required';
    if (!idNumber.trim()) errs.idNumber = 'ID proof number is required';
    if (!checkInDate) errs.checkInDate = 'Check-in date is required';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      showToast('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    const fd = new FormData();
    fd.append('hostel_id', HOSTEL_ID);
    fd.append('full_name', fullName.trim());
    fd.append('phone', phone);
    fd.append('email', email.trim());
    fd.append('gender', gender);
    fd.append('purpose', purpose.trim());
    fd.append('check_in_date', checkInDate);
    fd.append('days', String(days));
    fd.append('id_proof_type_id', String(idTypeId));
    fd.append('id_proof_number', idNumber.trim());
    fd.append('notes', guestNotes.trim());
    if (profileFile) fd.append('profile_photo', profileFile);
    if (frontFile)   fd.append('id_proof_front', frontFile);
    if (backFile)    fd.append('id_proof_back', backFile);

    try {
      const res = await fetch(`${API_BASE}/public/guest-signup?hostelId=${encodeURIComponent(HOSTEL_ID)}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

        setSubmitted({
          reference_id: data.data?.reference_id || `GST-${Date.now()}`,
          student_name: data.data?.full_name || fullName.trim(),
          hostel_name:  hostelInfo?.hostel_name || 'Hostix PG',
          phone: phone,
          email: email,
          submitted_at: formattedDate,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        showToast(data.error || 'Guest check-in submission failed.');
      }
    } catch {
      showToast('Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyRef = () => {
    if (!submitted) return;
    navigator.clipboard.writeText(submitted.reference_id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    showToast('Reference ID copied to clipboard');
  };

  const hostelName    = hostelInfo?.hostel_name || 'Hostix Luxury PG & Coliving';
  const hostelCity    = hostelInfo?.city    || '';
  const hostelAddress = hostelInfo?.address || '';

  // ── CELEBRATION SUCCESS SCREEN ──
  if (submitted) {
    return (
      <div className="app-container">
        <div className="form-content" style={{ textAlign: 'center', paddingTop: '40px' }}>
          <div className="anim-success-card">
            <div className="anim-check-circle">
              <Check size={40} color="#FFFFFF" strokeWidth={3} />
            </div>

            <div className="success-badge-tag">
              <Sparkles size={14} color="#047857" />
              <span>{IS_GUEST ? 'Visitor Check-In' : 'Admission Request'}</span>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              {IS_GUEST ? 'Check-In Requested!' : 'Registration Submitted!'}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, marginBottom: '24px' }}>
              {IS_GUEST
                ? 'Your check-in details have been received. Please collect your room key at reception.'
                : 'Your admission request has been sent to the property owner for review and room allocation.'}
            </p>

            <div className="ref-pill-card">
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '3px' }}>
                  Application Reference ID
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#4F46E5', fontFamily: 'monospace' }}>
                  {submitted.reference_id}
                </div>
              </div>
              <button
                type="button"
                onClick={copyRef}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#EEF2FF',
                  border: '1px solid #C7D2FE',
                  color: '#4F46E5',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', textAlign: 'left', fontSize: '12.5px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>Applicant:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{submitted.student_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>Property:</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>{submitted.hostel_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>Contact:</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>{submitted.phone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Time:</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>{submitted.submitted_at}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setSubmitted(null); setStep(1); }}
              className="btn-primary-action"
            >
              Submit Another Request
            </button>
          </div>
        </div>

        {/* Toast */}
        <div id="toast-el" className="floating-toast">
          <AlertCircle size={16} color="#FFFFFF" />
          <span id="toast-msg"></span>
        </div>
      </div>
    );
  }

  // ── GUEST SINGLE-PAGE SELF CHECK-IN ──
  if (IS_GUEST) {
    return (
      <div className="app-container">
        {/* Header */}
        <header className="top-header" style={{ background: '#2E1065' }}>
          <div className="top-bar">
            <div className="brand-badge">
              <Building2 size={16} color="#A78BFA" />
              <span className="brand-title">HOSTIX</span>
            </div>
            <span className="portal-subtitle" style={{ color: '#DDD6FE' }}>
              Visitor Self Check-In
            </span>
          </div>
          <div className="hostel-title-box">
            <h1 className="hostel-main-name">{hostelName}</h1>
            {(hostelCity || hostelAddress) && (
              <p className="hostel-address-text" style={{ color: '#C4B5FD' }}>
                <MapPin size={12} color="#A78BFA" />
                {[hostelAddress, hostelCity].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSubmitGuest} className="form-content">
          {/* Section 1: Guest Personal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <UserCheck size={18} color="#7C3AED" />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Guest Information</h3>
          </div>

          {/* Photo Avatar */}
          <input ref={profileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onProfileChange} />
          <div className="avatar-section">
            <div className="avatar-preview-box" onClick={() => profileInputRef.current?.click()}>
              {profileUri ? (
                <img src={profileUri} alt="Avatar" />
              ) : (
                <Camera size={20} color="#7C3AED" />
              )}
            </div>
            <div className="avatar-info-text">
              <h4>Guest Photo</h4>
              <p>{profileFile ? profileFile.name : 'Optional portrait photo'}</p>
            </div>
            <button
              type="button"
              className="avatar-action-btn"
              style={{ color: '#7C3AED', borderColor: '#DDD6FE' }}
              onClick={() => profileInputRef.current?.click()}
            >
              {profileUri ? 'Change' : 'Upload'}
            </button>
          </div>

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">
              Full Name <span className="req-star">*</span>
            </label>
            <input
              type="text"
              required
              className={`form-input ${errors.fullName ? 'has-error' : ''}`}
              placeholder="e.g. Suresh Kumar"
              value={fullName}
              onChange={e => { setFullName(e.target.value); setErrors(p => { const n = { ...p }; delete n.fullName; return n; }); }}
            />
            {errors.fullName && <div className="field-error-text">{errors.fullName}</div>}
          </div>

          {/* Mobile Number */}
          <div className="form-group">
            <label className="form-label">
              Mobile Number <span className="req-star">*</span>
            </label>
            <div className={`phone-input-wrap ${errors.phone ? 'has-error' : ''}`}>
              <span className="phone-prefix-tag">+91</span>
              <input
                type="tel"
                required
                className="phone-field-input"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={e => handlePhone(e.target.value)}
              />
            </div>
            {errors.phone && <div className="field-error-text">{errors.phone}</div>}
          </div>

          {/* Gender */}
          <div className="form-group">
            <label className="form-label">Gender</label>
            <div className="gender-selector">
              {['Male', 'Female', 'Other'].map(g => (
                <button
                  key={g}
                  type="button"
                  className={`gender-option-btn ${gender === g ? 'selected' : ''}`}
                  style={gender === g ? { background: '#F5F3FF', borderColor: '#7C3AED', color: '#7C3AED' } : {}}
                  onClick={() => setGender(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address (Optional)</label>
            <input
              type="email"
              className="form-input"
              placeholder="guest@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          {/* Section 2: Stay Details */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '22px', marginBottom: '14px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
            <Calendar size={18} color="#7C3AED" />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Stay Details</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Purpose of Visit</label>
            <select
              className="form-input"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              {GUEST_PURPOSES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Check-In Date */}
          <div className="form-group">
            <label className="form-label">
              Check-In Date <span className="req-star">*</span>
            </label>
            <input
              type="date"
              required
              className="form-input"
              value={checkInDate}
              onChange={e => setCheckInDate(e.target.value)}
            />
          </div>

          {/* Stay Duration (Full Width Next Line) */}
          <div className="form-group">
            <label className="form-label">Stay Duration</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              {[
                { val: 1, label: '1 Day' },
                { val: 2, label: '2 Days' },
                { val: 3, label: '3 Days' },
                { val: 5, label: '5 Days' },
                { val: 7, label: '7 Days' },
              ].map(item => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setDays(item.val)}
                  style={{
                    height: '42px',
                    borderRadius: '8px',
                    border: days === item.val ? '1.5px solid #7C3AED' : '1px solid #E2E8F0',
                    background: days === item.val ? '#F5F3FF' : '#FFFFFF',
                    color: days === item.val ? '#7C3AED' : '#475569',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: KYC ID Verification */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '22px', marginBottom: '14px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
            <ShieldCheck size={18} color="#10B981" />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>ID Proof Verification</h3>
          </div>

          <div className="form-group">
            <label className="form-label">ID Document Type <span className="req-star">*</span></label>
            <select
              className="form-input"
              value={idTypeId}
              onChange={e => { setIdTypeId(Number(e.target.value)); setIdNumber(''); }}
              style={{ cursor: 'pointer' }}
            >
              {ID_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Document Number <span className="req-star">*</span>
            </label>
            <input
              type="text"
              required
              className={`form-input ${errors.idNumber ? 'has-error' : ''}`}
              placeholder={ID_TYPES.find(t => t.id === idTypeId)?.hint || 'Enter document number'}
              value={idNumber}
              onChange={e => handleIdNumber(e.target.value)}
            />
            {errors.idNumber && <div className="field-error-text">{errors.idNumber}</div>}
          </div>

          {/* ID Front and Back photo uploads */}
          <input ref={frontInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFrontChange} />
          <input ref={backInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onBackChange} />

          <div className="form-group">
            <label className="form-label">ID Document Photos</label>
            <div className="doc-upload-grid">
              {/* Front Photo */}
              <div
                className={`doc-upload-card ${frontUri ? 'has-file' : ''}`}
                onClick={() => frontInputRef.current?.click()}
              >
                {frontUri ? (
                  <>
                    <img src={frontUri} alt="ID Front" className="doc-img-preview" />
                    <span className="doc-card-title" style={{ color: '#065F46' }}>Front Added</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} color="#94A3B8" />
                    <span className="doc-card-title">Upload Front</span>
                    <span className="doc-card-hint">Camera or gallery</span>
                  </>
                )}
              </div>

              {/* Back Photo */}
              <div
                className={`doc-upload-card ${backUri ? 'has-file' : ''}`}
                onClick={() => backInputRef.current?.click()}
              >
                {backUri ? (
                  <>
                    <img src={backUri} alt="ID Back" className="doc-img-preview" />
                    <span className="doc-card-title" style={{ color: '#065F46' }}>Back Added</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} color="#94A3B8" />
                    <span className="doc-card-title">Upload Back</span>
                    <span className="doc-card-hint">Camera or gallery</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="form-group">
            <label className="form-label">Special Remarks / Requests (Optional)</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="e.g. Need ground floor room, arriving late at 10 PM..."
              value={guestNotes}
              onChange={e => setGuestNotes(e.target.value)}
            />
          </div>

          {/* Submit Action */}
          <div style={{ marginTop: '24px' }}>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary-action"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' }}
            >
              {submitting ? 'Submitting Check-In...' : 'Complete Self Check-In'}
            </button>
          </div>
        </form>

        {/* Floating Toast */}
        <div id="toast-el" className="floating-toast">
          <AlertCircle size={16} color="#FFFFFF" />
          <span id="toast-msg"></span>
        </div>
      </div>
    );
  }

  // ── STUDENT 3-STEP ADMISSION FORM ──
  return (
    <div className="app-container">
      {/* Header */}
      <header className="top-header">
        <div className="top-bar">
          <div className="brand-badge">
            <Building2 size={16} color="#818CF8" />
            <span className="brand-title">HOSTIX</span>
          </div>
          <span className="portal-subtitle">Tenant Admission</span>
        </div>
        <div className="hostel-title-box">
          <h1 className="hostel-main-name">{hostelName}</h1>
          {(hostelCity || hostelAddress) && (
            <p className="hostel-address-text">
              <MapPin size={12} color="#818CF8" />
              {[hostelAddress, hostelCity].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </header>

      {/* Stepper Tabs */}
      <div className="stepper-nav">
        {[
          { num: 1, label: 'Personal' },
          { num: 2, label: 'KYC & ID' },
          { num: 3, label: 'Address' },
        ].map(s => {
          const isAct = step === s.num;
          const isComp = step > s.num;
          return (
            <div
              key={s.num}
              className={`step-tab ${isAct ? 'active' : ''} ${isComp ? 'completed' : ''}`}
            >
              <div className="step-mini-num">
                {isComp ? <Check size={11} strokeWidth={3} /> : s.num}
              </div>
              <span className="step-tab-label">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Form Steps */}
      <div className="form-content">
        {/* Step 1: Personal */}
        {step === 1 && (
          <div>
            {/* Avatar */}
            <input ref={profileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onProfileChange} />
            <div className="avatar-section">
              <div className="avatar-preview-box" onClick={() => profileInputRef.current?.click()}>
                {profileUri ? (
                  <img src={profileUri} alt="Avatar" />
                ) : (
                  <Camera size={20} color="#4F46E5" />
                )}
              </div>
              <div className="avatar-info-text">
                <h4>Profile Photo</h4>
                <p>{profileFile ? profileFile.name : 'Optional student portrait'}</p>
              </div>
              <button
                type="button"
                className="avatar-action-btn"
                onClick={() => profileInputRef.current?.click()}
              >
                {profileUri ? 'Change' : 'Upload'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">First Name <span className="req-star">*</span></label>
                <input
                  type="text"
                  required
                  className={`form-input ${errors.firstName ? 'has-error' : ''}`}
                  placeholder="First name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
                {errors.firstName && <div className="field-error-text">{errors.firstName}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Last name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div className="form-group">
              <label className="form-label">Mobile Number <span className="req-star">*</span></label>
              <div className={`phone-input-wrap ${errors.phone ? 'has-error' : ''}`}>
                <span className="phone-prefix-tag">+91</span>
                <input
                  type="tel"
                  required
                  className="phone-field-input"
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={e => handlePhone(e.target.value)}
                />
              </div>
              {errors.phone && <div className="field-error-text">{errors.phone}</div>}
            </div>

            {/* Gender */}
            <div className="form-group">
              <label className="form-label">Gender</label>
              <div className="gender-selector">
                {['Male', 'Female', 'Other'].map(g => (
                  <button
                    key={g}
                    type="button"
                    className={`gender-option-btn ${gender === g ? 'selected' : ''}`}
                    onClick={() => setGender(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Email & DOB */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className={`form-input ${errors.email ? 'has-error' : ''}`}
                  placeholder="student@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                {errors.email && <div className="field-error-text">{errors.email}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  className="form-input"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                />
              </div>
            </div>

            <div className="action-btn-row">
              <button
                type="button"
                className="btn-primary-action"
                onClick={() => { if (validateStep1()) setStep(2); }}
              >
                <span>Continue to KYC & ID</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: KYC */}
        {step === 2 && (
          <div>
            <div className="form-group">
              <label className="form-label">ID Document Type <span className="req-star">*</span></label>
              <select
                className="form-input"
                value={idTypeId}
                onChange={e => { setIdTypeId(Number(e.target.value)); setIdNumber(''); }}
                style={{ cursor: 'pointer' }}
              >
                {ID_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Document Number <span className="req-star">*</span></label>
              <input
                type="text"
                required
                className={`form-input ${errors.idNumber ? 'has-error' : ''}`}
                placeholder={ID_TYPES.find(t => t.id === idTypeId)?.hint || 'Enter document number'}
                value={idNumber}
                onChange={e => handleIdNumber(e.target.value)}
              />
              {errors.idNumber && <div className="field-error-text">{errors.idNumber}</div>}
            </div>

            {/* Photos */}
            <input ref={frontInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFrontChange} />
            <input ref={backInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onBackChange} />

            <div className="form-group">
              <label className="form-label">ID Document Photos <span className="req-star">*</span></label>
              <div className="doc-upload-grid">
                <div
                  className={`doc-upload-card ${frontUri ? 'has-file' : ''}`}
                  onClick={() => frontInputRef.current?.click()}
                >
                  {frontUri ? (
                    <>
                      <img src={frontUri} alt="Front" className="doc-img-preview" />
                      <span className="doc-card-title" style={{ color: '#065F46' }}>Front Uploaded</span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} color="#94A3B8" />
                      <span className="doc-card-title">Front Photo *</span>
                    </>
                  )}
                </div>

                <div
                  className={`doc-upload-card ${backUri ? 'has-file' : ''}`}
                  onClick={() => backInputRef.current?.click()}
                >
                  {backUri ? (
                    <>
                      <img src={backUri} alt="Back" className="doc-img-preview" />
                      <span className="doc-card-title" style={{ color: '#065F46' }}>Back Uploaded</span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} color="#94A3B8" />
                      <span className="doc-card-title">Back Photo *</span>
                    </>
                  )}
                </div>
              </div>
              {(errors.front || errors.back) && (
                <div className="field-error-text">Please upload both front and back photos of your ID</div>
              )}
            </div>

            <div className="action-btn-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn-primary-action"
                onClick={() => { if (validateStep2()) setStep(3); }}
              >
                <span>Continue to Address</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Address & Guardian */}
        {step === 3 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Guardian Name <span className="req-star">*</span></label>
                <input
                  type="text"
                  required
                  className={`form-input ${errors.guardianName ? 'has-error' : ''}`}
                  placeholder="Guardian / Parent"
                  value={guardianName}
                  onChange={e => setGuardianName(e.target.value)}
                />
                {errors.guardianName && <div className="field-error-text">{errors.guardianName}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Guardian Mobile <span className="req-star">*</span></label>
                <div className={`phone-input-wrap ${errors.guardianPhone ? 'has-error' : ''}`}>
                  <span className="phone-prefix-tag">+91</span>
                  <input
                    type="tel"
                    required
                    className="phone-field-input"
                    placeholder="10-digit mobile"
                    value={guardianPhone}
                    onChange={e => handleGuardianPhone(e.target.value)}
                  />
                </div>
                {errors.guardianPhone && <div className="field-error-text">{errors.guardianPhone}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Permanent Address <span className="req-star">*</span></label>
              <textarea
                required
                className={`form-input ${errors.permAddr ? 'has-error' : ''}`}
                placeholder="House, street, town, pin code..."
                value={permAddr}
                onChange={e => {
                  setPermAddr(e.target.value);
                  if (sameAddr) setCurrentAddr(e.target.value);
                }}
              />
              {errors.permAddr && <div className="field-error-text">{errors.permAddr}</div>}
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={sameAddr}
                onChange={e => {
                  setSameAddr(e.target.checked);
                  if (e.target.checked) setCurrentAddr(permAddr);
                }}
              />
              <span>Present address is same as permanent address</span>
            </label>

            {!sameAddr && (
              <div className="form-group">
                <label className="form-label">Current / Working Address</label>
                <textarea
                  className="form-input"
                  placeholder="College, company, local address..."
                  value={currentAddr}
                  onChange={e => setCurrentAddr(e.target.value)}
                />
              </div>
            )}

            <div className="action-btn-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep(2)}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                className="btn-primary-action"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                onClick={handleSubmitStudent}
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Toast */}
      <div id="toast-el" className="floating-toast">
        <AlertCircle size={16} color="#FFFFFF" />
        <span id="toast-msg"></span>
      </div>
    </div>
  );
}
