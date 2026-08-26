/**
 * load_test.mjs — Hostix load test using autocannon
 *
 * Tests: Login, Dashboard, Tab switches under ~20 concurrent connections
 * Run AFTER migrating DB to local: node load_test.mjs
 *
 * Install first: npm install -g autocannon
 * Or run without install: npx autocannon <url>
 */

import { createPool } from 'mysql2/promise';
import { execSync } from 'child_process';

// ── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@hostix.in';
const TEST_PASS = process.env.TEST_PASS || 'Test@123';
const CONCURRENCY = 20;
const DURATION_SEC = 15;

// ── Helpers ───────────────────────────────────────────────────────────────────
function runAutocannon(title, url, opts = '') {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔥 ${title}`);
  console.log(`   URL: ${url}`);
  console.log(`   Concurrency: ${CONCURRENCY} | Duration: ${DURATION_SEC}s`);
  console.log('='.repeat(60));
  try {
    const result = execSync(
      `npx autocannon -c ${CONCURRENCY} -d ${DURATION_SEC} ${opts} "${url}"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    console.log(result);
  } catch (e) {
    console.log(e.stdout || e.message);
  }
}

// ── 1. Login endpoint ─────────────────────────────────────────────────────────
console.log('\n🚀 Hostix Production Load Test');
console.log(`   Target: ${API_BASE}`);
console.log(`   Time: ${new Date().toISOString()}\n`);

// First, get a real token
let authToken = '';
try {
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: TEST_EMAIL, password: TEST_PASS }),
  });
  const loginData = await loginRes.json();
  authToken = loginData?.data?.token || '';
  if (authToken) {
    console.log(`✅ Got auth token (${authToken.slice(0, 20)}...)`);
  } else {
    console.log('⚠️  Could not get token — authenticated tests will be skipped');
    console.log('   Set TEST_EMAIL and TEST_PASS env vars with real credentials');
  }
} catch (e) {
  console.log('⚠️  Could not reach API:', e.message);
  process.exit(1);
}

// ── BEFORE timings (single requests) ────────────────────────────────────────
console.log('\n=== BEFORE: Single request timings ===');
const authHeader = { Authorization: `Bearer ${authToken}` };

async function singleTime(label, url, opts = {}) {
  const t = Date.now();
  try {
    const res = await fetch(url, { headers: authHeader, ...opts });
    const ms = Date.now() - t;
    console.log(`  ${label}: ${ms}ms (status ${res.status})`);
    return ms;
  } catch (e) {
    console.log(`  ${label}: ERROR - ${e.message}`);
    return null;
  }
}

const loginMs = await singleTime('Login', `${API_BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier: TEST_EMAIL, password: TEST_PASS }),
});
const dashboardMs = await singleTime('Dashboard stats', `${API_BASE}/reports/dashboard-stats`);
const studentsMs = await singleTime('Students list', `${API_BASE}/students?limit=20&status=1`);
const feesMs = await singleTime('Fees summary', `${API_BASE}/monthly-fees/summary`);
const notificationsMs = await singleTime('Notifications', `${API_BASE}/notifications`);

console.log('\n📊 SUMMARY OF SINGLE-REQUEST TIMINGS:');
console.log(`  Login:               ${loginMs}ms`);
console.log(`  Dashboard stats:     ${dashboardMs}ms`);
console.log(`  Students (page 1):   ${studentsMs}ms`);
console.log(`  Fees summary:        ${feesMs}ms`);
console.log(`  Notifications:       ${notificationsMs}ms`);

// ── LOAD TEST: 20 concurrent ────────────────────────────────────────────────
if (authToken) {
  const H = `-H "Authorization: Bearer ${authToken}"`;

  runAutocannon('TEST 1: Login endpoint (20 concurrent)',
    `${API_BASE}/auth/login`,
    `-m POST -H "Content-Type: application/json" -b '{"identifier":"${TEST_EMAIL}","password":"${TEST_PASS}"}' -c ${CONCURRENCY} -d ${DURATION_SEC}`
  );

  runAutocannon('TEST 2: Dashboard stats (20 concurrent, authenticated)',
    `${API_BASE}/reports/dashboard-stats`,
    `${H} -c ${CONCURRENCY} -d ${DURATION_SEC}`
  );

  runAutocannon('TEST 3: Students list (20 concurrent, authenticated)',
    `${API_BASE}/students?limit=20&status=1`,
    `${H} -c ${CONCURRENCY} -d ${DURATION_SEC}`
  );

  runAutocannon('TEST 4: Fees summary (20 concurrent, authenticated)',
    `${API_BASE}/monthly-fees/summary`,
    `${H} -c ${CONCURRENCY} -d ${DURATION_SEC}`
  );
}

console.log('\n✅ Load test complete!');
console.log('\nKEY METRICS TO CHECK:');
console.log('  - Latency p99 < 1000ms → 🟢 good');
console.log('  - Latency p99 < 3000ms → 🟡 acceptable');
console.log('  - Latency p99 > 3000ms → 🔴 needs investigation');
console.log('  - Non-2xx responses > 1% → 🔴 errors under load\n');
process.exit(0);
