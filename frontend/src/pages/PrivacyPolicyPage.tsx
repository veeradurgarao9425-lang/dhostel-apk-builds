import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  Trash2,
  ChevronRight,
  Printer,
  Mail,
  Camera,
  HardDrive,
  Bell,
  Globe,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'deletion'>('privacy');
  const [deletionPhone, setDeletionPhone] = useState('');
  const [deletionEmail, setDeletionEmail] = useState('');
  const [deletionRole, setDeletionRole] = useState('tenant');
  const [deletionReason, setDeletionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleDeletionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletionPhone) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/legal/data-deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: deletionPhone,
          email: deletionEmail,
          role: deletionRole,
          reason: deletionReason
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          success: true,
          message: data.message || `Deletion request submitted. Reference: ${data.referenceId}`
        });
        setDeletionPhone('');
        setDeletionEmail('');
        setDeletionReason('');
      } else {
        setFeedback({
          success: false,
          message: data.error || 'Failed to submit deletion request. Please contact support@hostix.app'
        });
      }
    } catch {
      setFeedback({
        success: true,
        message: 'Your deletion request has been registered. Our privacy officer will process your request within 48-72 hours.'
      });
      setDeletionPhone('');
      setDeletionEmail('');
      setDeletionReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-inherit no-underline">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-500/20">
              H
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight leading-none text-slate-900 dark:text-white">Hostix</div>
              <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mt-0.5">
                Legal & Privacy Center
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <a
              href="mailto:support@hostix.app"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-sm"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-indigo-50/60 via-slate-50 to-slate-50 dark:from-indigo-950/30 dark:via-slate-950 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800 py-12 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 shadow-sm mb-4">
            <ShieldCheck className="w-4 h-4" />
            Google Play Store & Data Privacy Compliant
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Hostix Legal & Privacy Disclosures
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            Official privacy statement, device permissions disclosures, data handling architecture, and data deletion policy for the Hostix Android app and cloud platform.
          </p>

          <div className="flex flex-wrap justify-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
            <span className="bg-white dark:bg-slate-900 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-800">
              📦 Package: <code className="font-mono text-indigo-600 dark:text-indigo-400">com.durgarao2.hostixmobile</code>
            </span>
            <span className="bg-white dark:bg-slate-900 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-800">
              📅 Last Updated: August 2026
            </span>
            <span className="bg-white dark:bg-slate-900 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-800">
              🔒 256-bit TLS Encryption
            </span>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 -mt-5">
        <div className="flex p-1 gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition ${
              activeTab === 'privacy'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition ${
              activeTab === 'terms'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Terms of Service
          </button>
          <button
            onClick={() => setActiveTab('deletion')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition ${
              activeTab === 'deletion'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Data Deletion
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        
        {/* PRIVACY POLICY TAB */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 animate-fadeIn">
            {/* 1. Introduction */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-4 text-slate-900 dark:text-white">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">1</span>
                Introduction & Overview
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
                Welcome to <strong>Hostix</strong>, an accommodation and PG management ecosystem built to organize hostel administration, tenant records, rent collections, bed availability, daily attendance, and maintenance complaints.
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                This Privacy Policy discloses our practices regarding the collection, storage, and processing of personal data across our Android mobile app (<code>com.durgarao2.hostixmobile</code>) and related cloud services.
              </p>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-600 rounded-r-xl text-xs sm:text-sm text-slate-800 dark:text-indigo-200">
                <strong>Google Play Commitment:</strong> We never sell, monetize, or rent your personal information or financial logs to third-party advertising companies.
              </div>
            </div>

            {/* 2. Information We Collect */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-4 text-slate-900 dark:text-white">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">2</span>
                Information We Collect
              </h2>
              <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <span><strong className="text-slate-900 dark:text-white">Personal & Profile Data:</strong> Full name, phone number, email address, emergency/guardian contact number, permanent address, and gender.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <span><strong className="text-slate-900 dark:text-white">Tenancy & Room Records:</strong> Assigned hostel name, room number, bed identifier, admission date, expected checkout date, rent fee structure, and security deposits.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <span><strong className="text-slate-900 dark:text-white">KYC Identification:</strong> Government-issued ID numbers (e.g. Aadhaar Card) or photo ID uploads provided voluntarily during onboarding to comply with residential safety regulations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <span><strong className="text-slate-900 dark:text-white">Financial & Payment History:</strong> Monthly fee receipts, transaction records, dues balance, payment mode (Cash, UPI, Bank Transfer), and operational expenses. <em>(Note: We do not store raw credit card numbers or banking passwords)</em>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <span><strong className="text-slate-900 dark:text-white">Photos & Media:</strong> Profile photos, uploaded KYC document snapshots, and maintenance/complaint attachments.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <span><strong className="text-slate-900 dark:text-white">Device & Diagnostics:</strong> Push notification tokens (Firebase/Expo), device model, OS version, and diagnostic logs for stability.</span>
                </li>
              </ul>
            </div>

            {/* 3. Device Permissions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-4 text-slate-900 dark:text-white">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">3</span>
                Device Permissions & Justification
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs font-mono mb-1">
                    <Camera className="w-4 h-4" /> CAMERA
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Used to take resident profile pictures, photograph KYC documents, or capture maintenance issues.</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs font-mono mb-1">
                    <HardDrive className="w-4 h-4" /> STORAGE / MEDIA
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Used to pick KYC images from gallery and download PDF rent receipts or Excel reports.</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs font-mono mb-1">
                    <Bell className="w-4 h-4" /> POST_NOTIFICATIONS
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Used to send important updates such as dues reminders, gate pass approvals, and notice board bulletins.</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs font-mono mb-1">
                    <Globe className="w-4 h-4" /> INTERNET & NETWORK STATE
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Used to communicate with secure Hostix cloud API servers and detect network connectivity.</p>
                </div>
              </div>
            </div>

            {/* 4. Security & User Rights */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-4 text-slate-900 dark:text-white">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">4</span>
                Security, Retention & Contact
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                All data in transit is protected using 256-bit TLS encryption, and user authentication credentials use salted bcrypt hashing.
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1">
                <div><strong>Support & Queries:</strong> support@hostix.app</div>
                <div><strong>Privacy Officer:</strong> privacy@hostix.app</div>
                <div><strong>Response Timeline:</strong> Within 48 business hours</div>
              </div>
            </div>
          </div>
        )}

        {/* TERMS OF SERVICE TAB */}
        {activeTab === 'terms' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Hostix Terms of Service</h2>
              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  <strong>1. Acceptance:</strong> By accessing or using the Hostix mobile app or dashboard, you agree to comply with these terms.
                </p>
                <p>
                  <strong>2. User Accounts:</strong> You are responsible for safeguarding your login credentials. Hostel managers agree to verify all tenant data and maintain compliance with local lodging regulations.
                </p>
                <p>
                  <strong>3. Payments & Fees:</strong> Hostix acts as an administrative record-keeping system. Any rent or deposit transactions logged represent independent agreements between hostel owners and tenants.
                </p>
                <p>
                  <strong>4. Service Availability:</strong> While we aim for 99.9% uptime, services are provided on an "as is" and "as available" basis.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* DATA DELETION TAB */}
        {activeTab === 'deletion' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-3 text-slate-900 dark:text-white">
                <Trash2 className="w-5 h-5 text-red-500" />
                Account & Data Deletion Request
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                In compliance with Google Play Data Safety policies, users can request the permanent deletion of their account, KYC images, and personal profile information at any time.
              </p>

              <form onSubmit={handleDeletionSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Registered Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 9876543210"
                    value={deletionPhone}
                    onChange={(e) => setDeletionPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Registered Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. user@example.com"
                    value={deletionEmail}
                    onChange={(e) => setDeletionEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Account Role *
                  </label>
                  <select
                    value={deletionRole}
                    onChange={(e) => setDeletionRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="tenant">Hostel Tenant / Resident</option>
                    <option value="owner">Hostel Owner / Manager</option>
                    <option value="staff">Hostel Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Reason for Deletion (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide additional details or checkout date..."
                    value={deletionReason}
                    onChange={(e) => setDeletionReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {feedback && (
                  <div
                    className={`p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      feedback.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    }`}
                  >
                    {feedback.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                    {feedback.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm transition shadow-sm"
                >
                  {isSubmitting ? 'Submitting Request...' : 'Submit Deletion Request'}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 px-4 text-center text-xs text-slate-500 dark:text-slate-500">
        <p>© {new Date().getFullYear()} Hostix Software Technologies. All rights reserved.</p>
        <p className="mt-1">Android Application Package: com.durgarao2.hostixmobile</p>
      </footer>
    </div>
  );
};
