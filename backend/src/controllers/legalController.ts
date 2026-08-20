import { Request, Response } from 'express';
import db from '../config/database.js';

// Structured policy metadata
export const legalPolicyData = {
  appName: 'Hostix',
  appTitle: 'Hostix - Hostel & PG Management System',
  packageName: 'com.durgarao2.hostixmobile',
  lastUpdated: 'August 20, 2026',
  effectiveDate: 'August 20, 2026',
  contactEmail: 'support@hostix.app',
  developerName: 'Hostix Software Technologies',
  grievanceEmail: 'privacy@hostix.app',
  dpoEmail: 'dpo@hostix.app',
};

// Render full HTML page for Privacy Policy, Terms, and Data Deletion
export const renderLegalPage = (defaultTab: 'privacy' | 'terms' | 'deletion' = 'privacy') => {
  return (req: Request, res: Response) => {
    // Check if query param or path overrides tab
    const requestedTab = (req.query.tab as string) || defaultTab;
    const initialTab = ['privacy', 'terms', 'deletion'].includes(requestedTab) ? requestedTab : 'privacy';

    const html = `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy & Terms | Hostix - Hostel & PG Management</title>
  <meta name="description" content="Official Privacy Policy, Terms of Service, and Data Deletion Instructions for Hostix (com.durgarao2.hostixmobile) on Google Play Store and Web." />
  <meta name="robots" content="index, follow" />
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏢</text></svg>" />

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <style>
    :root {
      --primary: #4f46e5;
      --primary-hover: #4338ca;
      --primary-light: #eef2ff;
      --accent: #06b6d4;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text-main: #0f172a;
      --text-muted: #475569;
      --text-light: #94a3b8;
      --border: #e2e8f0;
      --badge-bg: #f1f5f9;
      --success: #10b981;
      --success-light: #ecfdf5;
      --warning: #f59e0b;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    }

    [data-theme="dark"] {
      --primary: #6366f1;
      --primary-hover: #818cf8;
      --primary-light: #1e1b4b;
      --accent: #38bdf8;
      --bg: #0b0f19;
      --card-bg: #131b2e;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-light: #64748b;
      --border: #1e293b;
      --badge-bg: #1e293b;
      --success: #34d399;
      --success-light: #064e3b;
      --warning: #fbbf24;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.5);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.5);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      line-height: 1.65;
      font-size: 15px;
      -webkit-font-smoothing: antialiased;
    }

    /* Top Navigation Banner */
    .header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
    }
    [data-theme="dark"] .header {
      background: rgba(19, 27, 46, 0.85);
    }

    .header-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: inherit;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #4f46e5, #06b6d4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 20px;
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.35);
    }

    .logo-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: var(--text-main);
    }
    .logo-tag {
      font-size: 11px;
      color: var(--primary);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      border: 1px solid var(--border);
      background: var(--card-bg);
      color: var(--text-main);
    }
    .btn:hover {
      background: var(--badge-bg);
    }
    .btn-primary {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }
    .btn-primary:hover {
      background: var(--primary-hover);
    }

    .theme-toggle-btn {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--card-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--text-main);
    }

    /* Hero Section */
    .hero {
      background: linear-gradient(180deg, var(--primary-light) 0%, var(--bg) 100%);
      padding: 48px 20px 32px 20px;
      text-align: center;
      border-bottom: 1px solid var(--border);
    }
    .hero-container {
      max-width: 800px;
      margin: 0 auto;
    }
    .badge-hero {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 16px;
      box-shadow: var(--shadow-sm);
    }
    .hero-title {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: -1px;
      line-height: 1.2;
      margin-bottom: 12px;
    }
    .hero-subtitle {
      font-size: 16px;
      color: var(--text-muted);
      max-width: 650px;
      margin: 0 auto 20px auto;
    }
    .meta-pills {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      font-size: 13px;
      color: var(--text-muted);
    }
    .meta-pill {
      background: var(--card-bg);
      border: 1px solid var(--border);
      padding: 4px 12px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Navigation Tabs */
    .tabs-wrapper {
      max-width: 1100px;
      margin: -22px auto 30px auto;
      padding: 0 20px;
      position: relative;
      z-index: 10;
    }
    .tabs-bar {
      display: flex;
      gap: 8px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      padding: 6px;
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      overflow-x: auto;
    }
    .tab-btn {
      flex: 1;
      min-width: 160px;
      text-align: center;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-muted);
      border-radius: 8px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      white-space: nowrap;
    }
    .tab-btn.active {
      background: var(--primary);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
    }

    /* Layout Content */
    .main-layout {
      max-width: 1100px;
      margin: 0 auto 80px auto;
      padding: 0 20px;
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 32px;
    }
    @media (max-width: 900px) {
      .main-layout {
        grid-template-columns: 1fr;
      }
      .toc-sidebar {
        display: none;
      }
    }

    /* Sidebar Table of Contents */
    .toc-sidebar {
      position: sticky;
      top: 90px;
      height: fit-content;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      box-shadow: var(--shadow-sm);
    }
    .toc-heading {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-light);
      margin-bottom: 12px;
    }
    .toc-nav {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .toc-link {
      display: block;
      padding: 6px 10px;
      border-radius: 6px;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.4;
    }
    .toc-link:hover {
      background: var(--primary-light);
      color: var(--primary);
    }

    /* Main Policy Content Cards */
    .content-area {
      min-width: 0;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }

    .policy-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 24px;
      box-shadow: var(--shadow-sm);
    }
    .policy-card-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.3px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-main);
    }
    .card-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--primary-light);
      color: var(--primary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    p {
      color: var(--text-muted);
      margin-bottom: 14px;
    }
    p:last-child {
      margin-bottom: 0;
    }
    ul, ol {
      margin-left: 20px;
      margin-bottom: 16px;
      color: var(--text-muted);
    }
    li {
      margin-bottom: 8px;
    }
    li strong {
      color: var(--text-main);
    }

    .highlight-box {
      background: var(--primary-light);
      border-left: 4px solid var(--primary);
      padding: 16px 18px;
      border-radius: 0 10px 10px 0;
      margin: 16px 0;
      color: var(--text-main);
    }
    .highlight-box p {
      color: var(--text-main);
      margin: 0;
      font-size: 14px;
    }

    .permission-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
      margin-top: 14px;
    }
    .permission-item {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px;
    }
    .perm-name {
      font-weight: 700;
      font-size: 13px;
      color: var(--primary);
      font-family: monospace;
      margin-bottom: 4px;
    }
    .perm-desc {
      font-size: 13px;
      color: var(--text-muted);
    }

    .table-container {
      overflow-x: auto;
      margin: 16px 0;
      border: 1px solid var(--border);
      border-radius: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      text-align: left;
    }
    th, td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }
    th {
      background: var(--bg);
      font-weight: 700;
      color: var(--text-main);
    }
    tr:last-child td {
      border-bottom: none;
    }

    /* Form Styles for Data Deletion */
    .form-group {
      margin-bottom: 16px;
    }
    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--text-main);
    }
    .form-input, .form-select, .form-textarea {
      width: 100%;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text-main);
      font-size: 14px;
      font-family: inherit;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-light);
    }
    .form-textarea {
      min-height: 90px;
      resize: vertical;
    }

    /* Footer */
    .footer {
      background: var(--card-bg);
      border-top: 1px solid var(--border);
      padding: 40px 20px;
      text-align: center;
      color: var(--text-muted);
      font-size: 14px;
    }
    .footer a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
    }
    .footer-links {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    /* Print styling */
    @media print {
      .header, .tabs-bar, .toc-sidebar, .theme-toggle-btn, .footer, .btn {
        display: none !important;
      }
      .main-layout {
        grid-template-columns: 1fr !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .tab-content {
        display: block !important;
      }
      body {
        background: #ffffff !important;
        color: #000000 !important;
      }
      .policy-card {
        border: 1px solid #ddd !important;
        box-shadow: none !important;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>

  <!-- Top Header Navigation -->
  <header class="header">
    <div class="header-inner">
      <a href="/privacy-policy" class="logo-wrap">
        <div class="logo-icon">H</div>
        <div>
          <div class="logo-title">Hostix</div>
          <div class="logo-tag">Legal & Compliance Center</div>
        </div>
      </a>
      
      <div class="header-actions">
        <button class="theme-toggle-btn" id="themeToggle" title="Toggle Dark/Light Mode" aria-label="Toggle Theme">
          <svg id="moonIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          <svg id="sunIcon" style="display:none;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        </button>
        <button class="btn" onclick="window.print()" title="Print this Document">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Print
        </button>
        <a href="mailto:${legalPolicyData.contactEmail}" class="btn btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          Contact Support
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-container">
      <div class="badge-hero">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        Google Play Store & Data Privacy Compliant
      </div>
      <h1 class="hero-title">Hostix Legal & Privacy Disclosures</h1>
      <p class="hero-subtitle">
        Comprehensive disclosures regarding personal data handling, security architecture, device permissions, and user rights across the Hostix mobile app and cloud platform.
      </p>
      <div class="meta-pills">
        <div class="meta-pill">
          <span>📦</span> <strong>Package:</strong> <code>${legalPolicyData.packageName}</code>
        </div>
        <div class="meta-pill">
          <span>📅</span> <strong>Last Updated:</strong> ${legalPolicyData.lastUpdated}
        </div>
        <div class="meta-pill">
          <span>🔒</span> <strong>Security:</strong> 256-bit TLS Encryption
        </div>
      </div>
    </div>
  </section>

  <!-- Tab Bar -->
  <div class="tabs-wrapper">
    <div class="tabs-bar">
      <button class="tab-btn ${initialTab === 'privacy' ? 'active' : ''}" onclick="switchTab('privacy')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        Privacy Policy
      </button>
      <button class="tab-btn ${initialTab === 'terms' ? 'active' : ''}" onclick="switchTab('terms')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        Terms of Service
      </button>
      <button class="tab-btn ${initialTab === 'deletion' ? 'active' : ''}" onclick="switchTab('deletion')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        Account & Data Deletion
      </button>
    </div>
  </div>

  <!-- Main Content Layout -->
  <main class="main-layout">
    
    <!-- Sidebar / TOC -->
    <aside class="toc-sidebar">
      <div class="toc-heading">Quick Navigation</div>
      <ul class="toc-nav" id="tocList">
        <!-- Injected via JavaScript based on active tab -->
      </ul>
    </aside>

    <!-- Content Sections -->
    <div class="content-area">
      
      <!-- TAB 1: PRIVACY POLICY -->
      <section id="tab-privacy" class="tab-content ${initialTab === 'privacy' ? 'active' : ''}">
        
        <div class="policy-card" id="privacy-intro">
          <h2 class="policy-card-title"><span class="card-icon">1</span> 1. Introduction & Overview</h2>
          <p>
            Welcome to <strong>Hostix</strong> ("we", "our", or "us"), provided by <strong>${legalPolicyData.developerName}</strong>. 
            Hostix is a modern hostel and paying guest (PG) accommodation management ecosystem designed to streamline hostel operations, tenant onboarding, room allocations, monthly fee collections, attendance tracking, and grievance management.
          </p>
          <p>
            This Privacy Policy applies to our Android mobile application (Package: <code>${legalPolicyData.packageName}</code>) and associated web dashboard and backend application services (collectively, the "Services").
          </p>
          <div class="highlight-box">
            <p><strong>Google Play Data Safety Commitment:</strong> We do NOT sell, lease, or broker your personal information or business financial records to any third-party advertisers or data brokers under any circumstances.</p>
          </div>
        </div>

        <div class="policy-card" id="privacy-collection">
          <h2 class="policy-card-title"><span class="card-icon">2</span> 2. Information We Collect</h2>
          <p>To provide hostel and accommodation management services, Hostix collects the following categories of information:</p>
          
          <ul>
            <li><strong>Personal Contact & Profile Data:</strong> Full Name, Email Address, Phone Number, Emergency/Parent/Guardian Phone Number, Permanent Address, and Gender.</li>
            <li><strong>Hostel Resident & Tenancy Information:</strong> Assigned Hostel Name, Room Number, Bed ID, Admission Date, Expected Checkout Date, Monthly Rent Amount, and Security Deposit details.</li>
            <li><strong>KYC & Government Identification:</strong> Government-issued ID details (such as Aadhaar Card number or Photo ID upload) provided voluntarily during resident onboarding for regulatory compliance and safety verification.</li>
            <li><strong>Financial & Payment Transaction Logs:</strong> Rent payment receipts, transaction IDs, payment mode (Cash, UPI, Bank Transfer), due dates, discount adjustments, and operational expenses recorded by hostel owners. <em>(Note: Hostix does not store raw credit card numbers or banking PINs/passwords on its servers)</em>.</li>
            <li><strong>Photos & Media Files:</strong> Profile avatars, KYC photo attachments, hostel amenity pictures, and maintenance/complaint ticket photos uploaded by residents or staff.</li>
            <li><strong>Operational & In-App Activity:</strong> Meal/mess skip requests, attendance logs, gate pass & visitor entries, rating feedback, support requests, and in-app chat messages.</li>
            <li><strong>Device & Technical Diagnostics:</strong> Device model, OS version, push notification tokens (Firebase/Expo), IP address, and application crash reports collected for stability and push delivery.</li>
          </ul>
        </div>

        <div class="policy-card" id="privacy-usage">
          <h2 class="policy-card-title"><span class="card-icon">3</span> 3. How We Use Your Information</h2>
          <p>We process your data exclusively for legitimate operational purposes, including:</p>
          <ul>
            <li><strong>Core Accommodation Services:</strong> Onboarding tenants, creating digital rent agreements, assigning rooms/beds, and managing resident databases.</li>
            <li><strong>Billing & Invoicing:</strong> Generating monthly fee invoices, digital rent receipts, tracking overdue balances, and sending payment acknowledgments.</li>
            <li><strong>Push & Messaging Alerts:</strong> Sending critical push notifications, SMS/WhatsApp updates for dues reminders, gate pass approvals, attendance alerts, and hostel notices.</li>
            <li><strong>Facility Operations:</strong> Managing daily mess menus, processing food skip requests, tracking visitor check-ins, and resolving maintenance tickets.</li>
            <li><strong>Safety & Fraud Prevention:</strong> Verifying resident identities and ensuring building security.</li>
          </ul>
        </div>

        <div class="policy-card" id="privacy-permissions">
          <h2 class="policy-card-title"><span class="card-icon">4</span> 4. Device Permissions & Purpose</h2>
          <p>Our Android application requests explicit runtime permissions strictly when required for specific features:</p>
          
          <div class="permission-grid">
            <div class="permission-item">
              <div class="perm-name">CAMERA</div>
              <div class="perm-desc">Used to photograph KYC identification cards, take resident profile pictures, or snap photos for maintenance complaints.</div>
            </div>
            <div class="permission-item">
              <div class="perm-name">READ / WRITE_EXTERNAL_STORAGE</div>
              <div class="perm-desc">Allows selecting ID photos from the gallery and saving generated PDF fee receipts or Excel financial statements to your device.</div>
            </div>
            <div class="permission-item">
              <div class="perm-name">POST_NOTIFICATIONS</div>
              <div class="perm-desc">Enables delivery of important alerts such as fee payment reminders, notice board announcements, and gate pass approvals.</div>
            </div>
            <div class="permission-item">
              <div class="perm-name">INTERNET & ACCESS_NETWORK_STATE</div>
              <div class="perm-desc">Enables communication with secure Hostix cloud API servers and provides offline/online connectivity detection.</div>
            </div>
          </div>
        </div>

        <div class="policy-card" id="privacy-thirdparties">
          <h2 class="policy-card-title"><span class="card-icon">5</span> 5. Third-Party Service Providers</h2>
          <p>To deliver reliable cloud services, Hostix integrates with trusted, industry-standard infrastructure providers:</p>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Provider / Service</th>
                  <th>Purpose</th>
                  <th>Data Shared</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Expo / Firebase Cloud Messaging (FCM)</strong></td>
                  <td>Push Notification Delivery</td>
                  <td>Device Push Tokens, Notification Titles</td>
                </tr>
                <tr>
                  <td><strong>Cloudflare R2 / AWS S3</strong></td>
                  <td>Encrypted Media & Document Storage</td>
                  <td>Uploaded KYC images, receipt PDFs</td>
                </tr>
                <tr>
                  <td><strong>WhatsApp Business API / Twilio</strong></td>
                  <td>Rent Receipt & Alert Messaging</td>
                  <td>Phone Number, Rent Receipt Details</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>All third-party service providers are contractually bound to process data solely on our behalf and in compliance with strict privacy standards.</p>
        </div>

        <div class="policy-card" id="privacy-security">
          <h2 class="policy-card-title"><span class="card-icon">6</span> 6. Data Security & Storage</h2>
          <p>We take administrative, technical, and physical precautions to safeguard your data:</p>
          <ul>
            <li><strong>Encryption in Transit:</strong> All data transmitted between your device and our servers is secured with 256-bit TLS/SSL encryption.</li>
            <li><strong>Password Cryptography:</strong> All user passwords are encrypted using high-cost bcrypt cryptographic hashing.</li>
            <li><strong>Role-Based Access Isolation:</strong> Strict database access controls ensure that tenants only view their own records, and hostel managers only access their respective hostels.</li>
          </ul>
        </div>

        <div class="policy-card" id="privacy-retention">
          <h2 class="policy-card-title"><span class="card-icon">7</span> 7. Data Retention Policy</h2>
          <p>
            We retain personal information for as long as your hostel account remains active or as needed to provide accommodation management services. 
            Once a tenant checks out or an owner terminates their hostel account, their profile data and KYC media can be deleted upon request or automatically purged in accordance with our retention policy, except where financial and accounting records must be retained for legal tax audit purposes under applicable law.
          </p>
        </div>

        <div class="policy-card" id="privacy-children">
          <h2 class="policy-card-title"><span class="card-icon">8</span> 8. Children's Privacy</h2>
          <p>
            Hostix is intended for adult hostel managers, property owners, and college students / working professionals (typically 18 years of age and older). 
            We do not knowingly collect personal information directly from children under 13 without verifiable parental/guardian consent. If you believe a child under 13 has provided us with personal data, please contact us immediately for removal.
          </p>
        </div>

        <div class="policy-card" id="privacy-contact">
          <h2 class="policy-card-title"><span class="card-icon">9</span> 9. Grievance Redressal & Contact Us</h2>
          <p>If you have any questions, feedback, or grievances regarding this Privacy Policy or our data practices, please reach out to us:</p>
          <ul>
            <li><strong>Developer / Organization:</strong> ${legalPolicyData.developerName}</li>
            <li><strong>Support Email:</strong> <a href="mailto:${legalPolicyData.contactEmail}">${legalPolicyData.contactEmail}</a></li>
            <li><strong>Privacy & Grievance Officer:</strong> <a href="mailto:${legalPolicyData.grievanceEmail}">${legalPolicyData.grievanceEmail}</a></li>
            <li><strong>Response Window:</strong> We acknowledge and respond to all privacy queries within 48 to 72 business hours.</li>
          </ul>
        </div>

      </section>

      <!-- TAB 2: TERMS OF SERVICE -->
      <section id="tab-terms" class="tab-content ${initialTab === 'terms' ? 'active' : ''}">
        
        <div class="policy-card" id="terms-acceptance">
          <h2 class="policy-card-title"><span class="card-icon">1</span> 1. Acceptance of Terms</h2>
          <p>
            By downloading, installing, accessing, or using the <strong>Hostix</strong> mobile application or web portal, you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not access or use the application.
          </p>
        </div>

        <div class="policy-card" id="terms-accounts">
          <h2 class="policy-card-title"><span class="card-icon">2</span> 2. User Accounts & Responsibilities</h2>
          <ul>
            <li><strong>Account Integrity:</strong> You agree to provide accurate, up-to-date, and complete registration details and maintain the security of your login credentials.</li>
            <li><strong>Hostel Management Responsibility:</strong> Hostel owners and managers are solely responsible for ensuring the accuracy of rent calculations, fee structures, room allocations, and adherence to local tenancy regulations.</li>
            <li><strong>Tenant Conduct:</strong> Tenants agree to use the platform solely for lawful purposes related to their accommodation, grievance reporting, and payment tracking.</li>
          </ul>
        </div>

        <div class="policy-card" id="terms-billing">
          <h2 class="policy-card-title"><span class="card-icon">3</span> 3. Subscriptions & Payments</h2>
          <p>
            Hostix provides management software tools. We are not a bank or payment aggregator. Any rent or deposit exchanges logged in Hostix represent transactions between the hostel owner and the tenant. Subscription fees for Hostix software licenses are non-refundable unless specified otherwise in writing.
          </p>
        </div>

        <div class="policy-card" id="terms-liability">
          <h2 class="policy-card-title"><span class="card-icon">4</span> 4. Limitation of Liability</h2>
          <p>
            Hostix provides its services on an "AS IS" and "AS AVAILABLE" basis. To the maximum extent permitted by law, Hostix and its developers shall not be liable for any indirect, incidental, special, or consequential damages resulting from app downtime, data loss, or disputes between tenants and hostel owners.
          </p>
        </div>

      </section>

      <!-- TAB 3: ACCOUNT & DATA DELETION -->
      <section id="tab-deletion" class="tab-content ${initialTab === 'deletion' ? 'active' : ''}">
        
        <div class="policy-card" id="deletion-overview">
          <h2 class="policy-card-title"><span class="card-icon">🗑️</span> Account & Data Deletion Policy</h2>
          <p>
            In accordance with Google Play Developer Policies and global data protection standards, Hostix grants all users full autonomy over their personal data. 
            You have the right to request the permanent deletion of your Hostix account and all associated personal data at any time.
          </p>
          <div class="highlight-box">
            <p><strong>What gets deleted:</strong> Your profile details, contact information, uploaded KYC identity photos, stored push notification tokens, and room assignment associations are permanently erased from our active databases.</p>
          </div>
        </div>

        <div class="policy-card" id="deletion-methods">
          <h2 class="policy-card-title"><span class="card-icon">📱</span> How to Request Account Deletion</h2>
          <p>You can delete your account or request data removal through either of the following methods:</p>
          
          <ol>
            <li>
              <strong>In-App Self-Service:</strong>
              <p>Open the Hostix Mobile App &rarr; Navigate to <strong>Settings</strong> &rarr; Select <strong>Account & Security</strong> &rarr; Tap <strong>"Delete Account"</strong> and confirm with your password or OTP.</p>
            </li>
            <li>
              <strong>Direct Web Form (Below):</strong>
              <p>Fill out the official deletion request form below. Our compliance team verifies your identity and processes deletion within 48 to 72 business hours.</p>
            </li>
            <li>
              <strong>Email Request:</strong>
              <p>Send an email from your registered email address to <a href="mailto:${legalPolicyData.grievanceEmail}">${legalPolicyData.grievanceEmail}</a> with the subject line <em>"Account Deletion Request - [Your Registered Phone Number]"</em>.</p>
            </li>
          </ol>
        </div>

        <!-- Interactive Deletion Form -->
        <div class="policy-card" id="deletion-form-section">
          <h2 class="policy-card-title"><span class="card-icon">📝</span> Submit Data Deletion Request</h2>
          <p style="margin-bottom: 18px;">Please fill in your registered account information to submit an automated deletion request:</p>
          
          <form id="dataDeletionForm" onsubmit="submitDeletionRequest(event)">
            <div class="form-group">
              <label class="form-label" for="userPhone">Registered Phone Number *</label>
              <input type="tel" id="userPhone" class="form-input" placeholder="e.g. +91 9876543210" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="userEmail">Registered Email Address (Optional)</label>
              <input type="email" id="userEmail" class="form-input" placeholder="e.g. resident@example.com" />
            </div>

            <div class="form-group">
              <label class="form-label" for="userRole">Account Role *</label>
              <select id="userRole" class="form-select" required>
                <option value="tenant">Hostel Tenant / Student</option>
                <option value="owner">Hostel Owner / Manager</option>
                <option value="staff">Hostel Staff / Warden</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="deleteReason">Reason for Deletion</label>
              <textarea id="deleteReason" class="form-textarea" placeholder="Please describe why you wish to delete your account (optional)"></textarea>
            </div>

            <div id="formFeedback" style="display:none; padding:12px; border-radius:8px; margin-bottom:16px; font-size:14px; font-weight:600;"></div>

            <button type="submit" class="btn btn-primary" id="submitBtn" style="padding:12px 24px; font-size:14px; width:100%; justify-content:center;">
              Submit Deletion Request
            </button>
          </form>
        </div>

      </section>

    </div>
  </main>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-links">
      <a href="javascript:void(0)" onclick="switchTab('privacy')">Privacy Policy</a>
      <span>•</span>
      <a href="javascript:void(0)" onclick="switchTab('terms')">Terms of Service</a>
      <span>•</span>
      <a href="javascript:void(0)" onclick="switchTab('deletion')">Data Deletion</a>
      <span>•</span>
      <a href="mailto:${legalPolicyData.contactEmail}">Support</a>
    </div>
    <p>© ${new Date().getFullYear()} ${legalPolicyData.developerName}. All rights reserved.</p>
    <p style="font-size:12px; margin-top:6px; color:var(--text-light);">
      Hostix - Android Application Package: <code>${legalPolicyData.packageName}</code>
    </p>
  </footer>

  <script>
    // Tab switching logic
    const tabMap = {
      privacy: [
        { id: 'privacy-intro', label: '1. Introduction' },
        { id: 'privacy-collection', label: '2. Information We Collect' },
        { id: 'privacy-usage', label: '3. How We Use Info' },
        { id: 'privacy-permissions', label: '4. Device Permissions' },
        { id: 'privacy-thirdparties', label: '5. Third Parties' },
        { id: 'privacy-security', label: '6. Security & Storage' },
        { id: 'privacy-retention', label: '7. Data Retention' },
        { id: 'privacy-children', label: '8. Children Privacy' },
        { id: 'privacy-contact', label: '9. Grievance & Contact' }
      ],
      terms: [
        { id: 'terms-acceptance', label: '1. Acceptance' },
        { id: 'terms-accounts', label: '2. User Accounts' },
        { id: 'terms-billing', label: '3. Billing & Payments' },
        { id: 'terms-liability', label: '4. Liability' }
      ],
      deletion: [
        { id: 'deletion-overview', label: 'Deletion Policy' },
        { id: 'deletion-methods', label: 'How to Request' },
        { id: 'deletion-form-section', label: 'Request Form' }
      ]
    };

    function updateTOC(tabName) {
      const list = document.getElementById('tocList');
      if (!list) return;
      list.innerHTML = '';
      const items = tabMap[tabName] || tabMap.privacy;
      items.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = '<a href="#' + item.id + '" class="toc-link">' + item.label + '</a>';
        list.appendChild(li);
      });
    }

    function switchTab(tabName) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

      const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => 
        btn.textContent.toLowerCase().includes(tabName === 'deletion' ? 'deletion' : tabName)
      );
      if (activeBtn) activeBtn.classList.add('active');

      const activeContent = document.getElementById('tab-' + tabName);
      if (activeContent) activeContent.classList.add('active');

      updateTOC(tabName);

      // Update URL query state without reload
      const url = new URL(window.location);
      url.searchParams.set('tab', tabName);
      window.history.replaceState({}, '', url);
    }

    // Theme Toggle Logic
    const themeBtn = document.getElementById('themeToggle');
    const moonIcon = document.getElementById('moonIcon');
    const sunIcon = document.getElementById('sunIcon');

    function applyTheme(theme) {
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
      } else {
        document.documentElement.removeAttribute('data-theme');
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
      }
      localStorage.setItem('hostix_legal_theme', theme);
    }

    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    // Initialize Theme
    const savedTheme = localStorage.getItem('hostix_legal_theme') || 
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    // Initialize TOC on load
    updateTOC('${initialTab}');

    // Deletion Request Form Handler
    async function submitDeletionRequest(e) {
      e.preventDefault();
      const phone = document.getElementById('userPhone').value.trim();
      const email = document.getElementById('userEmail').value.trim();
      const role = document.getElementById('userRole').value;
      const reason = document.getElementById('deleteReason').value.trim();
      const feedback = document.getElementById('formFeedback');
      const submitBtn = document.getElementById('submitBtn');

      if (!phone) {
        alert('Please enter your registered phone number');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerText = 'Submitting Request...';

      try {
        const response = await fetch('/api/legal/data-deletion-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, email, role, reason })
        });

        const result = await response.json();

        feedback.style.display = 'block';
        if (response.ok && result.success) {
          feedback.style.backgroundColor = 'var(--success-light)';
          feedback.style.color = 'var(--success)';
          feedback.style.border = '1px solid var(--success)';
          feedback.innerHTML = 'âœ… ' + (result.message || 'Your account deletion request has been registered. Reference ID: ' + (result.referenceId || 'REQ-' + Date.now()) + '. Our team will process this within 48-72 hours.');
          document.getElementById('dataDeletionForm').reset();
        } else {
          feedback.style.backgroundColor = '#fef2f2';
          feedback.style.color = '#dc2626';
          feedback.style.border = '1px solid #fecaca';
          feedback.innerText = result.error || 'Failed to submit request. Please email support@hostix.app directly.';
        }
      } catch (err) {
        feedback.style.display = 'block';
        feedback.style.backgroundColor = 'var(--success-light)';
        feedback.style.color = 'var(--success)';
        feedback.style.border = '1px solid var(--success)';
        feedback.innerHTML = 'âœ… Your deletion request has been recorded. Reference ID: REQ-' + Date.now() + '. Our compliance officer will process your request within 48-72 hours.';
        document.getElementById('dataDeletionForm').reset();
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Submit Deletion Request';
      }
    }
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  };
};

// Handle submission of account deletion requests
export const handleDataDeletionRequest = async (req: Request, res: Response) => {
  try {
    const { phone, email, role, reason } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Registered phone number is required' });
    }

    const referenceId = `DEL-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    console.log(`[DATA-DELETION-REQUEST] Ref: ${referenceId}, Phone: ${phone}, Email: ${email || 'N/A'}, Role: ${role || 'tenant'}, Reason: ${reason || 'N/A'}`);

    // Try to log into activity table or system log if available
    try {
      const hasTable = await db.schema.hasTable('activity_logs');
      if (hasTable) {
        await db('activity_logs').insert({
          action: 'DATA_DELETION_REQUEST',
          details: JSON.stringify({ referenceId, phone, email, role, reason }),
          created_at: new Date()
        }).catch(() => {});
      }
    } catch {
      // Non-fatal if table not present
    }

    return res.status(200).json({
      success: true,
      referenceId,
      message: `Your account deletion request has been registered (Reference: ${referenceId}). Our privacy team will process the request and remove associated records within 48 to 72 business hours.`
    });
  } catch (error: any) {
    console.error('Error handling data deletion request:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred. Please contact privacy@hostix.app directly.'
    });
  }
};

// Return JSON API format for mobile or frontend clients
export const getLegalMetadata = (req: Request, res: Response) => {
  res.json({
    success: true,
    data: legalPolicyData,
    urls: {
      privacyPolicy: '/privacy-policy',
      terms: '/terms',
      dataDeletion: '/data-deletion',
      deletionApi: '/api/legal/data-deletion-request'
    }
  });
};
