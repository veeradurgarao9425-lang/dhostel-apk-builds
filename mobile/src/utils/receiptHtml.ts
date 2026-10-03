/**
 * receiptHtml.ts
 *
 * Professional, fintech-grade A4 payment receipt for Hostix Hostel & PG Management.
 * Designed to look modern, clean, and institutional for both PDF export and physical printing.
 *
 * Features:
 *   • Top & bottom vibrant brand gradient accents.
 *   • Prominent Header with Hostel Branding & Receipt Identification.
 *   • Resident / Tenant spotlight with room and contact details.
 *   • High-impact Right Summary Card with big amount, status pill, amount in words,
 *     and live remaining balance (inspired by modern institutional receipts).
 *   • Structured 2-column transaction metadata grid with subtle watermark.
 *   • Full ledger breakdown line: Total Due → Paid Amount → Remaining Balance.
 *   • Terms & Conditions and Authorised Signatory with computer-generated disclaimer.
 */

export interface ReceiptData {
  documentTitle: string;      // RENT RECEIPT | WAGE RECEIPT
  hostelName: string;
  hostelAddress?: string;
  ownerName?: string;
  ownerContact?: string;
  payerLabel: string;         // "Paid By (Student)" etc.
  payerName: string;
  payerContact?: string;
  roomNo?: string;
  bedNo?: string;
  isStaff?: boolean;
  receiptNo: string;
  transactionTime: string;
  paymentMode: string;
  transactionId?: string;
  periodLabel: string;        // fee month / wage note
  amountPaid: number;
  /** Total owed for the period before this payment. Falls back to amountPaid. */
  duesAmount?: number;
  /** Outstanding after this payment. Falls back to dues - paid. */
  netBalance?: number;
  recordedBy?: string;
  remarks?: string;
}

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const money = (n: number) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Indian-system number to words — receipts are expected to carry this. */
export function amountInWords(input: number): string {
  const n = Math.floor(Math.abs(Number(input) || 0));
  if (n === 0) return 'Zero Rupees Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const under1000 = (x: number): string => {
    if (x === 0) return '';
    if (x < 20) return ones[x];
    if (x < 100) return `${tens[Math.floor(x / 10)]}${x % 10 ? ' ' + ones[x % 10] : ''}`;
    return `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? ' ' + under1000(x % 100) : ''}`;
  };

  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  if (crore) parts.push(`${under1000(crore)} Crore`);
  if (lakh) parts.push(`${under1000(lakh)} Lakh`);
  if (thousand) parts.push(`${under1000(thousand)} Thousand`);
  if (rest) parts.push(under1000(rest));

  return `${parts.join(' ')} Rupees Only`;
}

export function generateReceiptHtml(d: ReceiptData): string {
  const paid = Number(d.amountPaid) || 0;
  const dues = Number(d.duesAmount ?? paid) || 0;
  const balance = Number(d.netBalance ?? Math.max(0, dues - paid)) || 0;
  const settled = balance <= 0;

  const initials = (d.hostelName || 'H')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const recipientType = d.isStaff ? 'STAFF MEMBER' : 'RESIDENT';
  const paymentTypeName = d.isStaff ? 'Staff Wage' : 'Room Rent';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Payment Receipt - ${esc(d.receiptNo)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0F172A; background: #FFFFFF;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .accent-bar {
    height: 7px;
    background: linear-gradient(90deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%);
    width: 100%;
  }
  .page {
    padding: 30px 42px 28px;
    max-width: 820px;
    margin: 0 auto;
  }

  /* ── Header ────────────────────────────────────────────── */
  .header-table {
    width: 100%;
    border-collapse: collapse;
    padding-bottom: 18px;
    border-bottom: 1.5px solid #F1F5F9;
  }
  .header-table td {
    vertical-align: top;
    padding: 0;
  }
  .org-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .org-logo {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
    color: #FFFFFF;
    text-align: center;
    line-height: 44px;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.5px;
    box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
  }
  .org-name {
    font-size: 20px;
    font-weight: 800;
    color: #0F172A;
    letter-spacing: -0.3px;
    margin: 0;
  }
  .org-sub {
    font-size: 11px;
    color: #64748B;
    margin-top: 3px;
    font-weight: 500;
  }
  .header-right {
    text-align: right;
  }
  .receipt-heading {
    font-size: 13px;
    font-weight: 800;
    color: #6366F1;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    margin: 0;
  }
  .receipt-number {
    font-size: 13px;
    font-weight: 700;
    color: #1E293B;
    margin-top: 4px;
  }
  .receipt-date {
    font-size: 11px;
    color: #64748B;
    margin-top: 3px;
  }

  /* ── Tenant Spotlight Card ─────────────────────────────── */
  .student-section {
    margin-top: 22px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 14px 18px;
  }
  .student-tag {
    display: inline-block;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 1.2px;
    color: #6366F1;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .student-name {
    font-size: 18px;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.2px;
  }
  .student-meta {
    font-size: 11.5px;
    color: #475569;
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .meta-dot {
    color: #94A3B8;
  }

  /* ── 2-Column Split: Info Grid + Amount Card ───────────── */
  .split-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
  }
  .split-table td {
    vertical-align: top;
    padding: 0;
  }
  .split-left {
    width: 58%;
    padding-right: 18px;
    position: relative;
  }
  .split-right {
    width: 42%;
  }

  /* Watermark background on left */
  .watermark-container {
    position: relative;
  }
  .watermark-text {
    position: absolute;
    top: 50%;
    left: 45%;
    transform: translate(-50%, -50%) rotate(-18deg);
    font-size: 90px;
    font-weight: 900;
    color: rgba(99, 102, 241, 0.04);
    letter-spacing: 6px;
    user-select: none;
    pointer-events: none;
    z-index: 0;
  }

  /* Key-Value Details Grid */
  .details-grid {
    width: 100%;
    border-collapse: collapse;
    position: relative;
    z-index: 1;
  }
  .details-grid td {
    padding: 8px 6px;
    vertical-align: top;
  }
  .grid-cell-label {
    font-size: 9.5px;
    font-weight: 700;
    color: #64748B;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .grid-cell-value {
    font-size: 12.5px;
    font-weight: 700;
    color: #0F172A;
    line-height: 1.35;
  }

  /* High-Impact Right Summary Card (As in Reference) */
  .amount-box {
    border: 1.5px solid ${settled ? '#BBF7D0' : '#FECDD3'};
    background: ${settled ? '#F0FDF4' : '#FFF1F2'};
    border-radius: 12px;
    padding: 18px 20px 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  }
  .amount-box-top {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
  .status-pill {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    background: ${settled ? '#DCFCE7' : '#FFE4E6'};
    color: ${settled ? '#15803D' : '#BE123C'};
    border: 1px solid ${settled ? '#86EFAC' : '#FDA4AF'};
  }
  .total-label {
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 1.2px;
    color: #64748B;
    text-transform: uppercase;
    margin-top: 10px;
  }
  .total-figure {
    font-size: 32px;
    font-weight: 900;
    color: ${settled ? '#0F172A' : '#BE123C'};
    letter-spacing: -0.8px;
    line-height: 1.15;
    margin: 4px 0 2px;
  }
  .amount-words {
    font-size: 11px;
    color: #64748B;
    font-style: italic;
    line-height: 1.4;
    margin-top: 4px;
  }
  .box-divider {
    border-top: 1px dashed ${settled ? '#86EFAC' : '#FDA4AF'};
    margin: 14px 0 10px;
  }
  .balance-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .balance-label {
    font-size: 9px;
    font-weight: 800;
    color: #64748B;
    letter-spacing: 0.9px;
    text-transform: uppercase;
  }
  .balance-figure {
    font-size: 13px;
    font-weight: 800;
    color: ${settled ? '#15803D' : '#BE123C'};
  }

  /* ── Ledger Table ──────────────────────────────────────── */
  .ledger-section {
    margin-top: 24px;
  }
  .ledger-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    overflow: hidden;
  }
  .ledger-table thead th {
    background: #0F172A;
    color: #FFFFFF;
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 1.1px;
    padding: 9px 12px;
    text-align: right;
  }
  .ledger-table thead th:first-child {
    text-align: left;
  }
  .ledger-table tbody td {
    padding: 12px;
    font-size: 12px;
    border-bottom: 1px solid #E2E8F0;
    text-align: right;
  }
  .ledger-table tbody td:first-child {
    text-align: left;
  }
  .ledger-title {
    font-weight: 700;
    font-size: 12.5px;
    color: #0F172A;
  }
  .ledger-sub {
    font-size: 10.5px;
    color: #64748B;
    margin-top: 2px;
  }
  .col-due { color: #DC2626; font-weight: 700; }
  .col-paid { color: #15803D; font-weight: 800; }
  .col-bal { color: ${settled ? '#15803D' : '#DC2626'}; font-weight: 800; }

  /* ── Terms & Signatory ─────────────────────────────────── */
  .terms-sign-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 22px;
  }
  .terms-sign-table td {
    vertical-align: bottom;
    padding: 0;
  }
  .terms-box {
    width: 60%;
    padding-right: 20px;
  }
  .terms-heading {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 1.1px;
    color: #64748B;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .terms-box ul {
    margin: 0;
    padding-left: 15px;
  }
  .terms-box li {
    font-size: 10px;
    color: #64748B;
    line-height: 1.6;
    margin-bottom: 2px;
  }
  .sign-box {
    width: 40%;
    text-align: right;
  }
  .sign-line {
    display: inline-block;
    border-top: 1.5px solid #CBD5E1;
    padding-top: 6px;
    min-width: 175px;
    font-size: 11px;
    color: #334155;
    font-weight: 700;
  }
  .sign-role {
    font-size: 9.5px;
    color: #64748B;
    margin-top: 2px;
  }

  /* ── Footer ────────────────────────────────────────────── */
  .footer-row {
    margin-top: 24px;
    padding-top: 10px;
    border-top: 1px solid #F1F5F9;
    text-align: center;
    font-size: 9.5px;
    color: #94A3B8;
    line-height: 1.5;
  }
</style>
</head>
<body>

  <!-- Top Brand Accent Bar -->
  <div class="accent-bar"></div>

  <div class="page">

    <!-- ── Header Section ── -->
    <table class="header-table">
      <tr>
        <td>
          <div class="org-brand">
            <div class="org-logo">${esc(initials)}</div>
            <div>
              <h1 class="org-name">${esc(d.hostelName)}</h1>
              <div class="org-sub">${esc(d.hostelAddress || 'Hostel &amp; PG Resident Management')} · Official Transaction Receipt</div>
            </div>
          </div>
        </td>
        <td class="header-right">
          <div class="receipt-heading">${esc(d.documentTitle)}</div>
          <div class="receipt-number">No. ${esc(d.receiptNo)}</div>
          <div class="receipt-date">Issued: ${esc(d.transactionTime.split('•')[1] || d.transactionTime)}</div>
        </td>
      </tr>
    </table>

    <!-- ── Resident / Tenant Spotlight Card ── -->
    <div class="student-section">
      <div class="student-tag">${esc(recipientType)}</div>
      <div class="student-name">${esc(d.payerName)}</div>
      <div class="student-meta">
        ${d.roomNo && d.roomNo !== 'N/A' ? `<span>Room ${esc(d.roomNo)}</span><span class="meta-dot">·</span>` : ''}
        ${d.bedNo ? `<span>Bed: ${esc(d.bedNo)}</span><span class="meta-dot">·</span>` : ''}
        ${d.payerContact && d.payerContact !== 'N/A' ? `<span>${esc(d.payerContact)}</span><span class="meta-dot">·</span>` : ''}
        <span>Period: ${esc(d.periodLabel)}</span>
      </div>
    </div>

    <!-- ── 2-Column Split (Left Details + Right Amount Box) ── -->
    <div class="watermark-container">
      <div class="watermark-text">${settled ? 'PAID' : 'PARTIAL'}</div>

      <table class="split-table">
        <tr>
          <td class="split-left">
            <table class="details-grid">
              <tr>
                <td style="width: 50%;">
                  <div class="grid-cell-label">RECEIPT NO.</div>
                  <div class="grid-cell-value">${esc(d.receiptNo)}</div>
                </td>
                <td style="width: 50%;">
                  <div class="grid-cell-label">TRANSACTION DATE</div>
                  <div class="grid-cell-value">${esc(d.transactionTime)}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <div class="grid-cell-label">MODE OF PAYMENT</div>
                  <div class="grid-cell-value">${esc(d.paymentMode)}</div>
                </td>
                <td>
                  <div class="grid-cell-label">PAYMENT TYPE</div>
                  <div class="grid-cell-value">${esc(paymentTypeName)}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <div class="grid-cell-label">RECORDED BY</div>
                  <div class="grid-cell-value">${esc(d.recordedBy || d.ownerName || 'Hostel FrontDesk')}</div>
                </td>
                <td>
                  <div class="grid-cell-label">REFERENCE / UTR</div>
                  <div class="grid-cell-value">${esc(d.transactionId && d.transactionId !== 'N/A' ? d.transactionId : 'Cash / Direct')}</div>
                </td>
              </tr>
              ${d.remarks ? `
              <tr>
                <td colspan="2">
                  <div class="grid-cell-label">REMARKS</div>
                  <div class="grid-cell-value">${esc(d.remarks)}</div>
                </td>
              </tr>` : ''}
            </table>
          </td>

          <td class="split-right">
            <!-- Modern Amount Card (Exact layout reference) -->
            <div class="amount-box">
              <div class="amount-box-top">
                <span class="status-pill">${settled ? 'FULL PAYMENT' : 'PARTIAL PAID'}</span>
              </div>
              <div class="total-label">TOTAL AMOUNT RECEIVED</div>
              <div class="total-figure">₹ ${money(paid)}</div>
              <div class="amount-words">${esc(amountInWords(paid))}</div>
              <div class="box-divider"></div>
              <div class="balance-row">
                <span class="balance-label">REMAINING BALANCE</span>
                <span class="balance-figure">₹ ${money(balance)}</span>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- ── Ledger Breakdown Table ── -->
    <div class="ledger-section">
      <table class="ledger-table">
        <thead>
          <tr>
            <th>PARTICULARS</th>
            <th>TOTAL DUE</th>
            <th>AMOUNT PAID</th>
            <th>REMAINING BALANCE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="ledger-title">${d.isStaff ? 'Staff Wage Disbursement' : 'Room Rent &amp; Hostel Maintenance'}</div>
              <div class="ledger-sub">${esc(d.periodLabel)} · Settled via ${esc(d.paymentMode)}</div>
            </td>
            <td class="col-due">₹ ${money(dues)}</td>
            <td class="col-paid">₹ ${money(paid)}</td>
            <td class="col-bal">₹ ${money(balance)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Terms & Signatory Section ── -->
    <table class="terms-sign-table">
      <tr>
        <td class="terms-box">
          <div class="terms-heading">TERMS &amp; CONDITIONS</div>
          <ul>
            <li>This receipt acknowledges the payment recorded against the resident account above.</li>
            <li>Subject to realization — online transfers are valid upon bank credit confirmation.</li>
            <li>Discrepancies must be brought to notice within 7 days of receipt issue.</li>
          </ul>
        </td>
        <td class="sign-box">
          <div class="sign-line">${esc(d.recordedBy || d.ownerName || 'Authorized Signatory')}</div>
          <div class="sign-role">For ${esc(d.hostelName)}</div>
        </td>
      </tr>
    </table>

    <!-- ── Footer Disclaimer ── -->
    <div class="footer-row">
      Computer-generated receipt — no physical signature required · Generated on ${esc(d.transactionTime)} · HOSTIX
    </div>

  </div>

  <!-- Bottom Brand Accent Bar -->
  <div class="accent-bar" style="margin-top: 15px;"></div>

</body>
</html>`;
}

export default generateReceiptHtml;
