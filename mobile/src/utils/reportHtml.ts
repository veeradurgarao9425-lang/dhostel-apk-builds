// ─── Printable Monthly Report (HTML → PDF) ────────────────────────────────────
// Builds a clean, professional, purple-branded A4 report from data already
// loaded on the Reports screen. Rendered to PDF on-device via expo-print, so it
// works instantly and offline — no backend round-trip needed.

export type ReportData = {
  hostelName: string;
  ownerName?: string;
  periodLabel: string;       // e.g. "June 2026"
  totalRent: number;
  pending: number;
  totalExpenses: number;
  netProfit: number;
  collectionRate: number;
  occupancyRate: number;
  occupiedBeds: number;
  totalBeds: number;
  defaulters: { name: string; amount: number; days: number }[];
  expenses: { description?: string; category?: string; amount: number; expense_date?: string }[];
  trend: { monthLabel?: string; month?: string; income?: number; expenses?: number }[];
};

const PURPLE = '#5F2EEA';
const PURPLE_DARK = '#3B0FAB';

const inr = (n: number) =>
  '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const esc = (s: any) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '';

export function buildReportHtml(d: ReportData): string {
  const generatedAt = new Date().toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const defaulterRows = d.defaulters.length
    ? d.defaulters
        .map(
          (x, i) => `<tr>
            <td class="rank">${i + 1}</td>
            <td>${esc(x.name) || 'Unknown'}</td>
            <td class="muted">${x.days > 0 ? `${x.days} days overdue` : 'Due soon'}</td>
            <td class="amt due">${inr(x.amount)}</td>
          </tr>`,
        )
        .join('')
    : `<tr><td colspan="4" class="empty">🎉 No pending dues this period</td></tr>`;

  const expenseRows = d.expenses.length
    ? d.expenses
        .slice(0, 25)
        .map(
          (e) => `<tr>
            <td>${esc(e.description || e.category || 'Expense')}</td>
            <td class="muted">${esc(fmtDate(e.expense_date))}</td>
            <td class="amt exp">- ${inr(Number(e.amount) || 0)}</td>
          </tr>`,
        )
        .join('')
    : `<tr><td colspan="3" class="empty">No expenses recorded</td></tr>`;

  const trendRows = d.trend.length
    ? d.trend
        .map((t) => {
          const net = (t.income || 0) - (t.expenses || 0);
          return `<tr>
            <td>${esc(t.monthLabel || t.month || '')}</td>
            <td class="amt pos">${inr(t.income || 0)}</td>
            <td class="amt exp">${inr(t.expenses || 0)}</td>
            <td class="amt ${net >= 0 ? 'pos' : 'exp'}">${inr(net)}</td>
          </tr>`;
        })
        .join('')
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #1A1A2E; margin: 0; padding: 0; font-size: 13px; }
  .header { background: linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%); color: #fff; padding: 28px 32px; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: .3px; }
  .header .sub { margin-top: 4px; font-size: 13px; opacity: .85; }
  .header .period { margin-top: 10px; display: inline-block; background: rgba(255,255,255,.18); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .wrap { padding: 24px 32px; }
  .kpis { display: flex; gap: 12px; margin-bottom: 24px; }
  .kpi { flex: 1; border: 1px solid #ECECF5; border-radius: 12px; padding: 14px; }
  .kpi .label { font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: #6B6B8A; font-weight: 700; }
  .kpi .value { font-size: 19px; font-weight: 800; margin-top: 6px; }
  .pos { color: #00875A; } .exp, .due { color: #E53935; } .purple { color: ${PURPLE}; }
  h2 { font-size: 14px; font-weight: 800; margin: 26px 0 10px; color: ${PURPLE_DARK}; border-left: 3px solid ${PURPLE}; padding-left: 9px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: #6B6B8A; padding: 8px 10px; border-bottom: 2px solid #ECECF5; }
  td { padding: 9px 10px; border-bottom: 1px solid #F2F2F8; font-size: 12.5px; }
  td.amt { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
  th.r { text-align: right; }
  td.rank { color: ${PURPLE}; font-weight: 800; width: 30px; }
  td.muted { color: #9A9AB5; }
  td.empty { text-align: center; color: #9A9AB5; padding: 18px; }
  .footer { margin-top: 30px; padding-top: 14px; border-top: 1px solid #ECECF5; font-size: 11px; color: #9A9AB5; text-align: center; }
  .bars { display: flex; justify-content: space-between; gap: 6px; }
</style></head>
<body>
  <div class="header">
    <h1>${esc(d.hostelName) || 'Hostel'} — Monthly Report</h1>
    <div class="sub">${esc(d.ownerName ? d.ownerName + ' • ' : '')}Stivo Hostel Management</div>
    <div class="period">${esc(d.periodLabel)}</div>
  </div>

  <div class="wrap">
    <div class="kpis">
      <div class="kpi"><div class="label">Collected</div><div class="value pos">${inr(d.totalRent)}</div></div>
      <div class="kpi"><div class="label">Pending</div><div class="value due">${inr(d.pending)}</div></div>
      <div class="kpi"><div class="label">Expenses</div><div class="value exp">${inr(d.totalExpenses)}</div></div>
      <div class="kpi"><div class="label">Net Profit</div><div class="value purple">${inr(d.netProfit)}</div></div>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="label">Collection Rate</div><div class="value">${d.collectionRate}%</div></div>
      <div class="kpi"><div class="label">Occupancy</div><div class="value">${d.occupancyRate}% &nbsp;<span style="font-size:12px;color:#9A9AB5;font-weight:600">(${d.occupiedBeds}/${d.totalBeds} beds)</span></div></div>
    </div>

    ${trendRows ? `<h2>Revenue Trend</h2>
    <table><thead><tr><th>Month</th><th class="r">Income</th><th class="r">Expense</th><th class="r">Net</th></tr></thead>
    <tbody>${trendRows}</tbody></table>` : ''}

    <h2>Top Rent Defaulters</h2>
    <table><thead><tr><th>#</th><th>Tenant</th><th>Status</th><th class="r">Balance</th></tr></thead>
    <tbody>${defaulterRows}</tbody></table>

    <h2>Expense Ledger</h2>
    <table><thead><tr><th>Description</th><th>Date</th><th class="r">Amount</th></tr></thead>
    <tbody>${expenseRows}</tbody></table>

    <div class="footer">
      Generated by Stivo on ${esc(generatedAt)} · This is a system-generated report.
    </div>
  </div>
</body></html>`;
}
