import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Mail, Lock, Eye, EyeOff, Shield, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

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

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: {
      identifier: '',
      password: '',
    },
    validationSchema: loginSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await login(values.identifier, values.password);

        // Check if user is Main Admin
        const user = useAuthStore.getState().user;
        if (user?.role_id !== 1) {
          toast.error('Access denied. This portal is for Main Admin only.');
          useAuthStore.getState().logout();
          setSubmitting(false);
          return;
        }

        toast.success('Welcome, Main Admin!');
        navigate('/dashboard');
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Invalid credentials');
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 dark:from-indigo-500/10 dark:to-purple-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 dark:from-cyan-500/10 dark:to-indigo-500/10 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-slate-250/20 dark:shadow-slate-950/50 relative z-10 rounded-[2rem]">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-655 dark:hover:text-slate-250 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/20">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Main Admin Portal
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Sign in to manage the entire system</p>
        </div>

        {/* Error Alert */}
        {formik.submitCount > 0 && Object.keys(formik.errors).length > 0 && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
            <p className="text-xs text-rose-600 dark:text-rose-455 font-medium">Please fix the validation errors below.</p>
          </div>
        )}

        <form onSubmit={formik.handleSubmit} className="space-y-5">
          <Input
            name="identifier"
            type="text"
            label="Email or Mobile Number"
            placeholder="admin@hostelapp.com"
            prefixIcon={<Mail className="h-4.5 w-4.5 text-slate-400" />}
            value={formik.values.identifier}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className="w-full text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none"
            error={
              formik.touched.identifier && formik.errors.identifier
                ? formik.errors.identifier
                : undefined
            }
          />

          <Input
            name="password"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="••••••••"
            prefixIcon={<Lock className="h-4.5 w-4.5 text-slate-400" />}
            suffixIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4.5 w-4.5" />
                ) : (
                  <Eye className="h-4.5 w-4.5" />
                )}
              </button>
            }
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className="w-full text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none"
            error={
              formik.touched.password && formik.errors.password
                ? formik.errors.password
                : undefined
            }
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full bg-gradient-to-r from-indigo-650 to-purple-650 text-white py-3 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
            isLoading={formik.isSubmitting}
          >
            Login as Admin
          </Button>
        </form>

        {/* Info Box */}
        <div className="mt-8 p-4.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
          <p className="text-xs text-indigo-700 dark:text-indigo-400 font-bold uppercase tracking-wider mb-1">
            System Level Access
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            This portal is restricted to Main Admin users. You will have full administrative access to all hostels, owners, and system-wide configurations.
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <p>Demo Admin Credentials:</p>
          <p className="font-mono mt-1.5 font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 py-1.5 px-3 rounded-lg inline-block">admin@hostelapp.com / password123</p>
        </div>
      </Card>
    </div>
  );
};
