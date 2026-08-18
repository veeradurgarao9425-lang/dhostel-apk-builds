/**
 * receiptHtml.ts
 *
 * The Hostix payment receipt, as a print-ready A4 document.
 *
 * Rendered to PDF on-device by expo-print, so it must be a single self-contained
 * HTML string: no external CSS, fonts, images or JS — the print engine fetches
 * nothing. Layout uses table/flex only (print engines are unreliable with grid).
 *
 * Design intent — an accounting document, not a coloured app screen:
 *   • Ink-light. One brand band at the top; everything else is type hierarchy
 *     and hairline rules, so it stays legible printed in black and white.
 *   • Billed To / Billed By side by side, the convention on a real invoice.
 *   • A true ledger line: Dues → Paid → Balance, so the reader can see what the
 *     payment settled rather than just the amount that changed hands.
 *   • Amount in words — expected on Indian receipts and what makes it read as
 *     a financial record.
 *   • Everything a dispute needs (receipt no, timestamp, mode, UTR, who
 *     recorded it) is on the page.
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

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0F172A; background: #FFFFFF;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page { padding: 34px 38px 28px; }

  /* ── Masthead ─────────────────────────────────────────── */
  .masthead {
    background: #6D28D9; color: #FFFFFF;
    padding: 20px 24px; border-radius: 12px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .brand { display: flex; align-items: center; gap: 13px; }
  .badge {
    width: 42px; height: 42px; border-radius: 10px;
    background: rgba(255,255,255,0.16);
    border: 1px solid rgba(255,255,255,0.28);
    text-align: center; line-height: 42px;
    font-size: 15px; font-weight: 800; letter-spacing: 0.5px;
  }
  .hostel-name { font-size: 17px; font-weight: 800; letter-spacing: 0.2px; }
  .hostel-sub { font-size: 10.5px; opacity: 0.82; margin-top: 2px; }
  .doc-meta { text-align: right; }
  .doc-title { font-size: 12.5px; font-weight: 800; letter-spacing: 1.6px; }
  .doc-no { font-size: 10.5px; opacity: 0.85; margin-top: 3px; }

  /* ── Status + amount strip ────────────────────────────── */
  .strip {
    display: flex; align-items: flex-end; justify-content: space-between;
    margin-top: 22px; padding-bottom: 16px;
    border-bottom: 2px solid #0F172A;
  }
  .paid-stamp {
    display: inline-block; padding: 5px 12px; border-radius: 5px;
    font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px;
    background: ${settled ? '#D1FAE5' : '#FEF3C7'};
    color: ${settled ? '#065F46' : '#92400E'};
    border: 1px solid ${settled ? '#6EE7B7' : '#FCD34D'};
  }
  .strip-label { font-size: 10px; color: #64748B; letter-spacing: 1.1px; font-weight: 700; margin-bottom: 3px; }
  .strip-amount { font-size: 30px; font-weight: 800; letter-spacing: -0.8px; line-height: 1; }
  .strip-right { text-align: right; }

  /* ── Party blocks ─────────────────────────────────────── */
  .parties { width: 100%; border-collapse: collapse; margin-top: 20px; }
  .parties td { width: 50%; vertical-align: top; padding: 0; }
  .parties td:first-child { padding-right: 18px; }
  .parties td:last-child { padding-left: 18px; border-left: 1px solid #E2E8F0; }
  .party-label {
    font-size: 9.5px; font-weight: 800; letter-spacing: 1.2px;
    color: #7C3AED; margin-bottom: 7px;
  }
  .party-name { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
  .party-line { font-size: 11.5px; color: #475569; line-height: 1.65; }

  /* ── Meta row ─────────────────────────────────────────── */
  .meta { width: 100%; border-collapse: collapse; margin-top: 20px;
          background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; }
  .meta td { padding: 10px 14px; vertical-align: top; }
  .meta-label { font-size: 9.5px; color: #64748B; font-weight: 700; letter-spacing: 0.8px; }
  .meta-value { font-size: 12px; font-weight: 700; margin-top: 3px; }

  /* ── Ledger ───────────────────────────────────────────── */
  .ledger { width: 100%; border-collapse: collapse; margin-top: 24px; }
  .ledger thead th {
    font-size: 9.5px; letter-spacing: 1px; font-weight: 800; color: #FFFFFF;
    background: #1E293B; padding: 10px 12px; text-align: right;
  }
  .ledger thead th:first-child { text-align: left; border-radius: 6px 0 0 0; }
  .ledger thead th:last-child { border-radius: 0 6px 0 0; }
  .ledger tbody td {
    padding: 13px 12px; font-size: 12px; text-align: right;
    border-bottom: 1px solid #E2E8F0;
  }
  .ledger tbody td:first-child { text-align: left; }
  .item-name { font-weight: 700; font-size: 12.5px; }
  .item-sub { font-size: 10.5px; color: #64748B; margin-top: 2px; }
  .num-dues { color: #B91C1C; font-weight: 700; }
  .num-paid { color: #047857; font-weight: 700; }
  .num-bal { font-weight: 800; color: ${settled ? '#047857' : '#B91C1C'}; }

  /* ── Totals ───────────────────────────────────────────── */
  .totals { width: 100%; border-collapse: collapse; margin-top: 14px; }
  .totals td { padding: 0; vertical-align: top; }
  .words-box {
    background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px;
    padding: 11px 13px; margin-right: 16px;
  }
  .words-label { font-size: 9.5px; font-weight: 800; letter-spacing: 0.9px; color: #64748B; }
  .words-value { font-size: 11.5px; font-weight: 700; margin-top: 4px; line-height: 1.5; }
  .grand {
    background: #6D28D9; color: #FFFFFF; border-radius: 8px;
    padding: 13px 16px; text-align: right; min-width: 210px;
  }
  .grand-label { font-size: 9.5px; letter-spacing: 1.2px; font-weight: 700; opacity: 0.9; }
  .grand-value { font-size: 21px; font-weight: 800; margin-top: 3px; letter-spacing: -0.4px; }

  /* ── Terms + footer ───────────────────────────────────── */
  .terms { margin-top: 26px; }
  .terms-title { font-size: 10px; font-weight: 800; letter-spacing: 1.1px; color: #64748B; margin-bottom: 8px; }
  .terms li { font-size: 10.5px; color: #475569; line-height: 1.75; margin-bottom: 1px; }
  .terms ul { margin: 0; padding-left: 16px; }
  .sign {
    margin-top: 30px; text-align: right;
  }
  .sign-line { display: inline-block; border-top: 1px solid #94A3B8; padding-top: 6px; min-width: 190px;
               font-size: 10.5px; color: #475569; font-weight: 600; }
  .footer {
    margin-top: 26px; padding-top: 13px; border-top: 1px solid #E2E8F0;
    display: flex; align-items: center; justify-content: space-between;
  }
  .footer-note { font-size: 9.5px; color: #94A3B8; }
  .footer-brand { font-size: 10.5px; font-weight: 800; color: #6D28D9; letter-spacing: 0.6px; }
</style>
</head>
<body>
  <div class="page">

    <div class="masthead">
      <div class="brand">
        <div class="badge">${esc(initials)}</div>
        <div>
          <div class="hostel-name">${esc(d.hostelName)}</div>
          <div class="hostel-sub">${esc(d.hostelAddress || 'Hostel / PG Management')}</div>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-title">${esc(d.documentTitle)}</div>
        <div class="doc-no">No. ${esc(d.receiptNo)}</div>
      </div>
    </div>

    <div class="strip">
      <div>
        <div class="paid-stamp">${settled ? 'PAID IN FULL' : 'PART PAYMENT'}</div>
      </div>
      <div class="strip-right">
        <div class="strip-label">AMOUNT RECEIVED</div>
        <div class="strip-amount">₹${money(paid)}</div>
      </div>
    </div>

    <table class="parties">
      <tr>
        <td>
          <div class="party-label">${esc(d.payerLabel).toUpperCase()}</div>
          <div class="party-name">${esc(d.payerName)}</div>
          ${d.roomNo && d.roomNo !== 'N/A' ? `<div class="party-line">Room ${esc(d.roomNo)}</div>` : ''}
          ${d.payerContact && d.payerContact !== 'N/A' ? `<div class="party-line">${esc(d.payerContact)}</div>` : ''}
        </td>
        <td>
          <div class="party-label">RECEIVED BY</div>
          <div class="party-name">${esc(d.hostelName)}</div>
          ${d.ownerName ? `<div class="party-line">${esc(d.ownerName)}</div>` : ''}
          ${d.ownerContact ? `<div class="party-line">${esc(d.ownerContact)}</div>` : ''}
        </td>
      </tr>
    </table>

    <table class="meta">
      <tr>
        <td>
          <div class="meta-label">RECEIPT DATE</div>
          <div class="meta-value">${esc(d.transactionTime)}</div>
        </td>
        <td>
          <div class="meta-label">PAYMENT MODE</div>
          <div class="meta-value">${esc(d.paymentMode)}</div>
        </td>
        <td>
          <div class="meta-label">REFERENCE / UTR</div>
          <div class="meta-value">${esc(d.transactionId && d.transactionId !== 'N/A' ? d.transactionId : '—')}</div>
        </td>
      </tr>
    </table>

    <table class="ledger">
      <thead>
        <tr>
          <th>PARTICULARS</th>
          <th>DUES</th>
          <th>PAID</th>
          <th>BALANCE</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="item-name">${d.isStaff ? 'Wage / Advance' : 'Rent &amp; Fee Dues'}</div>
            <div class="item-sub">${esc(d.periodLabel)}</div>
          </td>
          <td class="num-dues">₹${money(dues)}</td>
          <td class="num-paid">₹${money(paid)}</td>
          <td class="num-bal">₹${money(balance)}</td>
        </tr>
      </tbody>
    </table>

    <table class="totals">
      <tr>
        <td>
          <div class="words-box">
            <div class="words-label">AMOUNT IN WORDS</div>
            <div class="words-value">${esc(amountInWords(paid))}</div>
          </div>
        </td>
        <td style="width: 230px;">
          <div class="grand">
            <div class="grand-label">TOTAL RECEIVED</div>
            <div class="grand-value">₹${money(paid)}</div>
          </div>
        </td>
      </tr>
    </table>

    <div class="terms">
      <div class="terms-title">TERMS &amp; CONDITIONS</div>
      <ul>
        <li>This receipt acknowledges the payment recorded against the account named above.</li>
        <li>Subject to realisation — a receipt for an online transfer is void if the transfer fails or is reversed.</li>
        <li>Any discrepancy must be reported to the management within 7 days of the receipt date.</li>
        <li>This is a computer-generated receipt and is valid without a physical signature.</li>
      </ul>
    </div>

    <div class="sign">
      <div class="sign-line">${esc(d.recordedBy || d.ownerName || 'Authorised Signatory')}</div>
    </div>

    <div class="footer">
      <div class="footer-note">Generated ${esc(d.transactionTime)} · Receipt ${esc(d.receiptNo)}</div>
      <div class="footer-brand">HOSTIX · PG OS</div>
    </div>

  </div>
</body>
</html>`;
}

export default generateReceiptHtml;
