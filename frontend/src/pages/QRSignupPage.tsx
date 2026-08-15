import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  User, Phone, Mail, Home, Users, Shield,
  ChevronRight, ChevronLeft, CheckCircle, Upload, Calendar,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  gender: string;
  permanent_address: string;
  guardian_name: string;
  guardian_phone: string;
  id_proof_number: string;
  aadhaar_front: File | null;
  aadhaar_back: File | null;
}

interface Errors {
  [key: string]: string;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
const steps = [
  { id: 1, label: 'Personal', icon: User },
  { id: 2, label: 'Guardian', icon: Users },
  { id: 3, label: 'Identity', icon: Shield },
];

const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center justify-between mb-10 relative px-4">
    {/* Progress line */}
    <div className="absolute top-5 left-10 right-10 h-1.5 bg-slate-100 z-0 rounded-full" />
    <div
      className="absolute top-5 left-10 h-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 z-0 transition-all duration-700 ease-in-out rounded-full shadow-[0_0_12px_rgba(124,58,237,0.4)]"
      style={{ width: current === 1 ? '0%' : current === 2 ? '50%' : '100%' }}
    />

    {steps.map((step) => {
      const Icon = step.icon;
      const isCompleted = current > step.id;
      const isActive = current === step.id;
      return (
        <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 font-bold text-sm
              ${isCompleted ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200 rotate-0' : ''}
              ${isActive ? 'bg-white text-violet-600 shadow-xl shadow-violet-100 ring-[5px] ring-violet-50 scale-110' : ''}
              ${!isCompleted && !isActive ? 'bg-slate-50 text-slate-400 border-2 border-slate-100' : ''}
            `}
          >
            {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
          </div>
          <span
            className={`text-[11px] font-black uppercase tracking-widest transition-colors duration-300
              ${isActive ? 'text-violet-700' : isCompleted ? 'text-slate-700' : 'text-slate-400'}
            `}
          >
            {step.label}
          </span>
        </div>
      );
    })}
  </div>
);

// ─── Field Components ─────────────────────────────────────────────────────────
const Field: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}> = ({ label, required, error, children }) => (
  <div className="mb-4">
    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
      {label} {required && <span className="text-red-500 normal-case tracking-normal text-sm">*</span>}
    </label>
    {children}
    {error && (
      <p className="mt-1 text-xs text-red-500 font-semibold flex items-center gap-1">
        <span>⚠</span> {error}
      </p>
    )}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }> = ({
  hasError, className = '', ...props
}) => (
  <input
    {...props}
    className={`w-full px-4 py-3.5 rounded-2xl border-2 text-sm font-semibold outline-none transition-all duration-300
      bg-slate-50/50 text-slate-800 placeholder-slate-400
      ${hasError
        ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10'
        : 'border-slate-100 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 hover:border-slate-200 hover:bg-slate-50'
      } ${className}`}
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }> = ({
  hasError, className = '', children, ...props
}) => (
  <select
    {...props}
    className={`w-full px-4 py-3.5 rounded-2xl border-2 text-sm font-semibold outline-none transition-all duration-300
      bg-slate-50/50 text-slate-800 appearance-none
      ${hasError
        ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10'
        : 'border-slate-100 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 hover:border-slate-200 hover:bg-slate-50'
      } ${className}`}
  >
    {children}
  </select>
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }> = ({
  hasError, className = '', ...props
}) => (
  <textarea
    {...props}
    className={`w-full px-4 py-3.5 rounded-2xl border-2 text-sm font-semibold outline-none transition-all duration-300
      bg-slate-50/50 text-slate-800 placeholder-slate-400 resize-y min-h-[100px]
      ${hasError
        ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10'
        : 'border-slate-100 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 hover:border-slate-200 hover:bg-slate-50'
      } ${className}`}
  />
);

// ─── File Upload Button ───────────────────────────────────────────────────────
const FileUpload: React.FC<{
  id: string;
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}> = ({ id, label, file, onChange }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="mb-4">
      <input
        ref={ref}
        id={id}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl border-2 font-bold text-sm transition-all duration-200
          ${file
            ? 'border-violet-500 bg-violet-50 text-violet-700'
            : 'border-dashed border-violet-300 bg-violet-50/50 text-violet-600 hover:bg-violet-50 hover:border-violet-400'
          }`}
      >
        {file ? (
          <>
            <CheckCircle className="w-4 h-4 text-violet-600" />
            <span className="truncate max-w-[200px]">{file.name}</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            {label}
          </>
        )}
      </button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const QRSignupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const hostelId = searchParams.get('hostelId') || '';
  const roomId = searchParams.get('roomId') || '';
  const bedId = searchParams.get('bedId') || '';
  const bedName = searchParams.get('bedName') || '';

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const [form, setForm] = useState<FormData>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    gender: '',
    permanent_address: '',
    guardian_name: '',
    guardian_phone: '',
    id_proof_number: '',
    aadhaar_front: null,
    aadhaar_back: null,
  });

  const update = (field: keyof FormData, value: string | File | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    
    // Real-time phone validation
    if (field === 'phone' && typeof value === 'string') {
        if (value.length === 10 && !/^[6-9]\d{9}$/.test(value)) {
            setErrors(prev => ({ ...prev, phone: 'Must be a valid Indian mobile number' }));
        } else {
            if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
        }
    } else if (field === 'guardian_phone' && typeof value === 'string') {
        if (value.length === 10 && !/^[6-9]\d{9}$/.test(value)) {
            setErrors(prev => ({ ...prev, guardian_phone: 'Must be a valid Indian mobile number' }));
        } else {
            if (errors.guardian_phone) setErrors(prev => ({ ...prev, guardian_phone: '' }));
        }
    } else {
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateStep1 = (): boolean => {
    const e: Errors = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit mobile number';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address';
    if (!form.permanent_address.trim()) e.permanent_address = 'Permanent address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = (): boolean => {
    const e: Errors = {};
    if (form.guardian_phone && !/^[6-9]\d{9}$/.test(form.guardian_phone))
      e.guardian_phone = 'Enter a valid 10-digit number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = (): boolean => {
    const e: Errors = {};
    if (!/^\d{12}$/.test(form.id_proof_number))
      e.id_proof_number = 'Aadhaar must be exactly 12 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    let ok = false;
    if (step === 1) ok = validateStep1();
    if (step === 2) ok = validateStep2();
    if (!ok) {
      toast.error('Please fix the errors before continuing.');
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setStep((s) => s - 1);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) {
      toast.error('Please fix the errors before submitting.');
      return;
    }

    if (!hostelId) {
      toast.error('Invalid registration link. Missing hostel information.');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Submitting your application...');

    const fd = new FormData();
    fd.append('first_name', form.first_name.trim());
    fd.append('last_name', form.last_name.trim());
    fd.append('phone', form.phone.trim());
    fd.append('email', form.email.trim());
    fd.append('date_of_birth', form.date_of_birth);
    fd.append('gender', form.gender);
    fd.append('permanent_address', form.permanent_address.trim());
    fd.append('guardian_name', form.guardian_name.trim());
    fd.append('guardian_phone', form.guardian_phone.trim());
    fd.append('id_proof_number', form.id_proof_number.trim());
    if (form.aadhaar_front) fd.append('aadhaar_front', form.aadhaar_front);
    if (form.aadhaar_back) fd.append('aadhaar_back', form.aadhaar_back);

    let url = `/api/public/qr-signup?hostelId=${encodeURIComponent(hostelId)}`;
    if (roomId) url += `&roomId=${encodeURIComponent(roomId)}`;
    if (bedId) url += `&bedId=${encodeURIComponent(bedId)}`;
    if (bedName) url += `&bedName=${encodeURIComponent(bedName)}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        body: fd,
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      toast.dismiss(toastId);

      if (res.ok && data.success) {
        setSuccess(true);
        toast.success('Application submitted successfully!');
      } else {
        toast.error(data.error || 'Registration failed. Please try again.');
        if ((data.error || '').toLowerCase().includes('aadhaar')) {
          setErrors({ id_proof_number: data.error });
          setStep(3);
        }
      }
    } catch {
      toast.dismiss(toastId);
      toast.error('Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success Screen ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-200">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3">Application Sent! 🎉</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Your details have been submitted successfully. The owner will verify and activate your
            account in the app.
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setStep(1);
              setForm({
                first_name: '', last_name: '', phone: '', email: '',
                date_of_birth: '', gender: '', permanent_address: '',
                guardian_name: '', guardian_phone: '', id_proof_number: '',
                aadhaar_front: null, aadhaar_back: null,
              });
            }}
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity shadow-lg shadow-violet-200"
          >
            Submit Another Form
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-white to-violet-50 flex items-start justify-center p-4 pt-8 pb-16">
      <div className="w-full max-w-xl">
        {/* Header - Premium Layout */}
        <div className="flex items-center gap-5 mb-8 bg-white/70 backdrop-blur-xl p-5 rounded-3xl shadow-sm border border-white">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-200/50 flex-shrink-0 transform transition-transform hover:scale-105">
            <Home className="w-8 h-8 text-white" />
          </div>
          <div className="text-left flex-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">Tenant Registration</h1>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">Complete the steps below to request admission</p>
          </div>
        </div>

        {/* Room pre-assignment banner */}
        {roomId && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 text-base">🏠</div>
            <div>
              <p className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-0.5">Pre-assigned Allocation</p>
              <p className="text-sm font-semibold text-emerald-700">
                Room: <strong className="text-emerald-900">{roomId}</strong>
                {bedName && <> &nbsp; Bed: <strong className="text-emerald-900">{bedName}</strong></>}
              </p>
              <p className="text-xs text-emerald-600 mt-1">This room/bed has been reserved for you by the owner.</p>
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-white p-6 sm:p-8">
          <StepIndicator current={step} />

          <form onSubmit={handleSubmit} noValidate>
            {/* ── STEP 1: Personal Details ─────────────────────────────── */}
            {step === 1 && (
              <div>
                <h3 className="text-base font-black text-slate-900 mb-5 flex items-center gap-2">
                  <User className="w-4 h-4 text-violet-600" /> Personal Details
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="First Name" required error={errors.first_name}>
                    <Input
                      placeholder="e.g. Ravi"
                      value={form.first_name}
                      onChange={(e) => update('first_name', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                      hasError={!!errors.first_name}
                      maxLength={50}
                    />
                  </Field>
                  <Field label="Last Name" error={errors.last_name}>
                    <Input
                      placeholder="e.g. Kumar"
                      value={form.last_name}
                      onChange={(e) => update('last_name', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                      maxLength={50}
                    />
                  </Field>
                </div>

                <Field label="Phone" required error={errors.phone}>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      className="pl-10"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      hasError={!!errors.phone}
                    />
                  </div>
                </Field>

                <Field label="Email Address" error={errors.email}>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      className="pl-10"
                      type="email"
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      hasError={!!errors.email}
                    />
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date of Birth" error={errors.date_of_birth}>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        className="pl-10"
                        type="date"
                        value={form.date_of_birth}
                        onChange={(e) => update('date_of_birth', e.target.value)}
                      />
                    </div>
                  </Field>
                  <Field label="Gender" error={errors.gender}>
                    <Select
                      value={form.gender}
                      onChange={(e) => update('gender', e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </Select>
                  </Field>
                </div>

                <Field label="Permanent Address" required error={errors.permanent_address}>
                  <div className="relative">
                    <Home className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <Textarea
                      className="pl-10"
                      placeholder="Full home address"
                      value={form.permanent_address}
                      onChange={(e) => update('permanent_address', e.target.value)}
                      hasError={!!errors.permanent_address}
                    />
                  </div>
                </Field>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-violet-200"
                >
                  Next: Guardian Details <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── STEP 2: Guardian Details ──────────────────────────────── */}
            {step === 2 && (
              <div>
                <h3 className="text-base font-black text-slate-900 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-600" /> Guardian Details
                </h3>
                <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                  Providing guardian details is optional but recommended for emergencies.
                </p>

                <Field label="Guardian Name" error={errors.guardian_name}>
                  <Input
                    placeholder="Parent / Guardian name"
                    value={form.guardian_name}
                    onChange={(e) => update('guardian_name', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                    maxLength={80}
                  />
                </Field>

                <Field label="Guardian Phone" error={errors.guardian_phone}>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      className="pl-10"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit number"
                      value={form.guardian_phone}
                      onChange={(e) => update('guardian_phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      hasError={!!errors.guardian_phone}
                    />
                  </div>
                </Field>

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-[2] flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-violet-200"
                  >
                    Next: Identity Docs <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Identity / Documents ─────────────────────────── */}
            {step === 3 && (
              <div>
                <h3 className="text-base font-black text-slate-900 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-violet-600" /> Identity Verification
                </h3>
                <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                  Upload clear photos of your Aadhaar card. You can choose from your gallery or take a new photo.
                </p>

                <Field label="Aadhaar Number" required error={errors.id_proof_number}>
                  <Input
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="12-digit Aadhaar number"
                    value={form.id_proof_number}
                    onChange={(e) => update('id_proof_number', e.target.value.replace(/\D/g, '').slice(0, 12))}
                    hasError={!!errors.id_proof_number}
                  />
                </Field>

                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  Aadhaar Card Photos (Optional)
                </p>
                <FileUpload
                  id="aadhaar_front"
                  label="📷 Tap to Upload Front"
                  file={form.aadhaar_front}
                  onChange={(f) => update('aadhaar_front', f)}
                />
                <FileUpload
                  id="aadhaar_back"
                  label="📷 Tap to Upload Back"
                  file={form.aadhaar_back}
                  onChange={(f) => update('aadhaar_back', f)}
                />

                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-violet-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" /> Submit Application
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-5">
          🔒 Your information is securely handled and only shared with your hostel owner.
        </p>
      </div>
    </div>
  );
};
