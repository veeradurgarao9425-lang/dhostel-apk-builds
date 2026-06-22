import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2, Users, CreditCard, Shield } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const loginSchema = Yup.object({
  identifier: Yup.string()
    .required('Email or mobile number is required')
    .test('identifier', 'Invalid email or mobile number', (value) => {
      if (!value) return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const mobileRegex = /^[0-9]{10}$/;
      return emailRegex.test(value) || mobileRegex.test(value);
    }),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setForgotLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setResetSent(true);
      toast.success('Password reset link sent to your email!');
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSent(false);
        setForgotEmail('');
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process forgot password request');
    } finally {
      setForgotLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      identifier: '',
      password: '',
    },
    validationSchema: loginSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setLoginError('');
      try {
        await login(values.identifier, values.password);

        const user = useAuthStore.getState().user;

        toast.success(`Welcome, ${user?.full_name}!`);

        if (user?.role_id === 1) {
          navigate('/dashboard');
        } else if (user?.role_id === 2) {
          navigate('/owner/dashboard');
        } else {
          navigate('/dashboard');
        }
      } catch (error: any) {
        let errorMessage = 'Invalid credentials. Please try again.';

        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response?.status === 401) {
          errorMessage = 'Invalid email/phone or password. Please check your credentials.';
        } else if (error.response?.status === 400) {
          errorMessage = 'Please enter valid email/phone and password.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        setLoginError(errorMessage);
        toast.error(errorMessage);
        console.error('Login error:', error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden font-sans">
      {/* Background Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 dark:from-cyan-500/10 dark:to-teal-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 dark:from-indigo-500/10 dark:to-purple-500/10 blur-[120px] pointer-events-none" />
      
      {/* Top Header / Navigation Bar */}
      <header className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-cyan-600 to-indigo-600 dark:from-cyan-400 dark:to-indigo-400 bg-clip-text text-transparent tracking-tight">dHostel</span>
            <span className="text-xs block text-slate-400 dark:text-slate-500 font-semibold leading-none">Smart Management</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/owner/login')}
            className="px-4 py-2 text-xs font-bold text-slate-650 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            Owner Portal
          </button>
          <button 
            onClick={() => navigate('/admin/login')}
            className="px-4.5 py-2 text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-all shadow-sm"
          >
            Admin Portal
          </button>
        </div>
      </header>

      {/* Mobile View */}
      <div className="flex-1 flex flex-col md:hidden z-10">
        {/* Top Section with Illustration */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-10 pb-6">
          {/* Hostel Icon */}
          <div className="relative mb-6">
            <div className="w-28 h-28 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-cyan-500/25 rotate-3 hover:rotate-0 transition-transform duration-300">
              <Building2 className="w-14 h-14 text-white" />
            </div>
            {/* Floating icons */}
            <div className="absolute -top-2 -right-2 w-9 h-9 bg-white dark:bg-slate-805 rounded-xl shadow-md flex items-center justify-center border border-slate-100 dark:border-slate-800">
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="absolute -bottom-2 -left-2 w-9 h-9 bg-white dark:bg-slate-805 rounded-xl shadow-md flex items-center justify-center border border-slate-100 dark:border-slate-800">
              <CreditCard className="w-4 h-4 text-cyan-550" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 text-center tracking-tight">
            Hostel Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-center text-sm max-w-xs leading-relaxed">
            Simplify your hostel operations with smart room allocation and rent tracking.
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] px-6 py-8 border-t border-slate-200/60 dark:border-slate-800/60">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1 text-center tracking-tight">Welcome Back</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 text-center">Sign in to manage your system</p>

          {/* Error Alert */}
          {loginError && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-205 dark:border-rose-900/30">
              <p className="text-xs text-rose-600 dark:text-rose-455 font-medium">{loginError}</p>
            </div>
          )}

          <form onSubmit={formik.handleSubmit} className="space-y-4">
            {/* Email/Phone Input */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                 Phone or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  name="identifier"
                  type="text"
                  placeholder="Enter email or phone"
                  value={formik.values.identifier}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full pl-11 pr-4 py-3 border text-sm rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:bg-slate-800/50 dark:text-white outline-none transition-all ${
                    formik.touched.identifier && formik.errors.identifier
                      ? 'border-rose-500'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
              </div>
              {formik.touched.identifier && formik.errors.identifier && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{formik.errors.identifier}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full pl-11 pr-12 py-3 border text-sm rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:bg-slate-800/50 dark:text-white outline-none transition-all ${
                    formik.touched.password && formik.errors.password
                      ? 'border-rose-500'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350" />
                  ) : (
                    <Eye className="h-4.5 w-4.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-355" />
                  )}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{formik.errors.password}</p>
              )}
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:from-cyan-700 hover:to-indigo-700 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 mt-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              {formik.isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Features */}
          <div className="mt-8 flex justify-center gap-8">
            <div className="text-center">
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-1 border border-slate-100 dark:border-slate-700/50">
                <Shield className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Secure</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-1 border border-slate-100 dark:border-slate-700/50">
                <Building2 className="w-5 h-5 text-cyan-500" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Easy</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-1 border border-slate-100 dark:border-slate-700/50">
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Smart</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex flex-1 relative z-10 max-w-7xl mx-auto w-full px-8 py-10 gap-10 items-center">
        {/* Left Side - Illustration & Interactive Mockup */}
        <div className="flex-1 flex flex-col items-start justify-center pr-8 space-y-8">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/30 mb-4">
              ✨ Modern Hostel Operations
            </span>
            <h1 className="text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Manage Hostels <br/>
              <span className="bg-gradient-to-r from-cyan-600 to-indigo-600 dark:from-cyan-400 dark:to-indigo-400 bg-clip-text text-transparent">With Absolute Ease</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg mt-4 max-w-lg leading-relaxed">
              An all-in-one software platform for room allocation, student details tracking, rent management, and expense logging.
            </p>
          </div>

          {/* Interactive Mockup Container */}
          <div className="relative w-full max-w-md p-6 bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl shadow-xl backdrop-blur-md group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-2 right-2 flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-400/80"></span>
              <span className="w-3 h-3 rounded-full bg-amber-400/80"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400/80"></span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Dashboard Preview</span>
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 px-2 py-0.5 rounded-full">Live Analytics</span>
              </div>

              {/* Fake Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center gap-1.5 text-xs text-slate-450 dark:text-slate-400">
                    <Users className="h-3.5 w-3.5 text-cyan-500" />
                    <span>Occupancy</span>
                  </div>
                  <p className="text-xl font-black text-slate-800 dark:text-white mt-1">94%</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center gap-1.5 text-xs text-slate-455 dark:text-slate-400">
                    <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Collected</span>
                  </div>
                  <p className="text-xl font-black text-slate-800 dark:text-white mt-1">₹1,84,000</p>
                </div>
              </div>

              {/* Fake Hostel Card */}
              <div className="p-4 bg-gradient-to-r from-cyan-600/5 to-indigo-650/5 dark:from-cyan-950/20 dark:to-indigo-950/20 border border-cyan-100/30 dark:border-cyan-900/20 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow text-white">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-white">Sunrise Boys Hostel</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Kothaguda, Hyderabad</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400 px-2 py-1 rounded-lg">Boys</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md flex flex-col justify-center p-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-slate-250/20 dark:shadow-slate-950/50 my-auto">
          <div className="mb-7">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Welcome Back</h2>
            <p className="text-slate-450 dark:text-slate-400 text-sm mt-1">Please sign in to your dashboard</p>
          </div>

          {/* Error Alert */}
          {loginError && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
              <p className="text-xs text-rose-600 dark:text-rose-455 font-medium">{loginError}</p>
            </div>
          )}

          <form onSubmit={formik.handleSubmit} className="space-y-4.5">
            {/* Email/Phone Input */}
            <div>
              <label className="block text-xs font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Email or Phone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  name="identifier"
                  type="text"
                  placeholder="Enter email or phone number"
                  value={formik.values.identifier}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full pl-11 pr-4 py-3 text-sm border rounded-xl bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all ${
                    formik.touched.identifier && formik.errors.identifier
                      ? 'border-rose-500'
                      : 'border-slate-200 dark:border-slate-700/80'
                  }`}
                />
              </div>
              {formik.touched.identifier && formik.errors.identifier && (
                <p className="mt-1 text-xs text-rose-500 font-semibold">{formik.errors.identifier}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full pl-11 pr-12 py-3 text-sm border rounded-xl bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all ${
                    formik.touched.password && formik.errors.password
                      ? 'border-rose-500'
                      : 'border-slate-200 dark:border-slate-700/80'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5 text-slate-400 hover:text-slate-600 transition-colors" />
                  ) : (
                    <Eye className="h-4.5 w-4.5 text-slate-400 hover:text-slate-600 transition-colors" />
                  )}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className="mt-1 text-xs text-rose-500 font-semibold">{formik.errors.password}</p>
              )}
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="w-full bg-gradient-to-r from-cyan-600 to-indigo-650 text-white py-3 rounded-xl font-bold hover:from-cyan-700 hover:to-indigo-700 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 mt-5 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              {formik.isSubmitting && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {formik.isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center border-t border-slate-100 dark:border-slate-800/85 pt-4">
            <p className="text-xs text-slate-400">
              Enterprise security enabled • GDPR Compliant
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Reset Password</h2>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSent(false);
                  setForgotEmail('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {resetSent ? (
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 border border-green-300">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-800 font-semibold text-sm mb-0.5">Check Your Email</p>
                  <p className="text-gray-500 text-xs">
                    We've sent a reset link to <span className="text-blue-500 font-medium">{forgotEmail}</span>
                  </p>
                </div>
                <p className="text-xs text-gray-400 pt-2">Expires in 1 hour</p>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <p className="text-xs text-gray-600 mb-4">
                  Enter your email and we'll send a reset link.
                </p>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotEmail('');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl font-medium text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2 px-3 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      'Send Link'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
