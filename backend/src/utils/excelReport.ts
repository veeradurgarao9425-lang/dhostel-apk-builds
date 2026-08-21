import ExcelJS from 'exceljs';
import db from '../config/database.js';
import { sendEmail, EmailAttachment } from './email.js';

// ─── Professional Corporate Color Palette ──────────────────────────────────────
const COLORS = {
  NAVY_HEADER: 'FF1E293B',    // Slate 800 - Primary Deep Header
  INDIGO_ACCENT: 'FF4F46E5',  // Indigo 600 - Brand Accent
  INDIGO_LIGHT: 'FFEEF2FF',   // Indigo 50 - Card background
  EMERALD_DARK: 'FF047857',   // Emerald 700 - Success / Paid
  EMERALD_LIGHT: 'FFD1FAE5',  // Emerald 100 - Success background
  ROSE_DARK: 'FFBE123C',      // Rose 700 - Expense / Dues / Inactive
  ROSE_LIGHT: 'FFFFF1F2',     // Rose 50 - Dues row highlight
  AMBER_DARK: 'FFB45309',     // Amber 700 - Partial / Warning
  AMBER_LIGHT: 'FFFEF3C7',    // Amber 100 - Warning background
  SLATE_HEADER: 'FF334155',   // Slate 700 - Sub-header
  SLATE_MUTED: 'FF64748B',    // Slate 500 - Subtitle / labels
  BORDER_LIGHT: 'FFE2E8F0',   // Slate 200 - Borders
  ZEBRA_BG: 'FFF8FAFC',       // Slate 50 - Alternate row
  WHITE: 'FFFFFFFF',
};

// ─── Border Helper ─────────────────────────────────────────────────────────────
const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
  left: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
  bottom: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
  right: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
};

const doubleBottomBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF94A3B8' } },
  left: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
  bottom: { style: 'double', color: { argb: 'FF1E293B' } },
  right: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
};

export const sendDailyOwnerReportEmail = async (userId: number, hostelId: number): Promise<void> => {
  try {
    // 1. Fetch Owner details
    const owner = await db('users').where('user_id', userId).first();
    if (!owner || !owner.email) {
      console.warn(`[ExcelReport] Owner with ID ${userId} not found or has no email.`);
      return;
    }

    // 2. Fetch Hostel details
    const hostel = await db('hostel_master').where('hostel_id', hostelId).first();
    if (!hostel) {
      console.warn(`[ExcelReport] Hostel with ID ${hostelId} not found.`);
      return;
    }

    const hostelName = hostel.hostel_name || 'My Hostel';
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dateStr = now.toISOString().split('T')[0];
    const generatedAtStr = now.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' });

    console.log(`[ExcelReport] Building Executive Multi-Sheet Excel Workbook for "${hostelName}"...`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hostix Management Cloud';
    workbook.lastModifiedBy = 'Hostix Automated System';
    workbook.created = now;
    workbook.modified = now;

    // =========================================================================
    // 1. DATA GATHERING
    // =========================================================================

    // A. Students Stats
    const allStudents = await db('students as s')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .where('s.hostel_id', hostelId)
      .select(
        's.*',
        'r.room_number',
        'r.floor_number'
      )
      .orderBy('s.is_active', 'desc')
      .orderBy('r.floor_number', 'asc')
      .orderBy('r.room_number', 'asc')
      .orderBy('s.first_name', 'asc');

    const activeStudentsList = allStudents.filter(s => s.is_active === 1);
    const leftStudentsList = allStudents.filter(s => s.is_active === 0);
    const totalStudentsCount = allStudents.length;
    const activeStudentsCount = activeStudentsList.length;
    const leftStudentsCount = leftStudentsList.length;

    // B. Rooms & Floors Stats
    const allRooms = await db('rooms')
      .where('hostel_id', hostelId)
      .select('room_id', 'room_number', 'floor_number', 'capacity', 'occupied_beds')
      .orderBy('floor_number', 'asc')
      .orderBy('room_number', 'asc');

    let totalCapacity = 0;
    let occupiedBeds = 0;
    allRooms.forEach(r => {
      totalCapacity += Number(r.capacity || 0);
      occupiedBeds += Number(r.occupied_beds || 0);
    });
    const availableBeds = Math.max(0, totalCapacity - occupiedBeds);
    const occupancyRate = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

    // C. Monthly Fees & Dues
    const feeRecords = await db('monthly_fees as mf')
      .join('students as s', 'mf.student_id', 's.student_id')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .where('mf.hostel_id', hostelId)
      .where('mf.fee_month', currentMonthStr)
      .select(
        's.first_name',
        's.last_name',
        's.phone',
        's.guardian_phone',
        'r.room_number',
        'r.floor_number',
        'mf.monthly_rent',
        'mf.carry_forward',
        'mf.total_due',
        'mf.paid_amount',
        'mf.balance',
        'mf.fee_status',
        'mf.due_date'
      )
      .orderBy('mf.balance', 'desc')
      .orderBy('s.first_name', 'asc');

    const paidRecords = feeRecords.filter(f => f.fee_status === 'Fully Paid');
    const partialRecords = feeRecords.filter(f => f.fee_status === 'Partially Paid');
    const pendingRecords = feeRecords.filter(f => f.fee_status === 'Pending' || f.fee_status === 'Overdue' || f.fee_status === 'Partially Paid');

    let totalBilledRent = 0;
    let totalCollectedThisMonth = 0;
    let totalPendingBalance = 0;

    feeRecords.forEach(f => {
      totalBilledRent += Number(f.total_due || 0);
      totalCollectedThisMonth += Number(f.paid_amount || 0);
      totalPendingBalance += Number(f.balance || 0);
    });

    // D. Payment Collections Log
    const paymentCollections = await db('fee_payments as fp')
      .join('students as s', 'fp.student_id', 's.student_id')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .where('fp.hostel_id', hostelId)
      .whereRaw("DATE_FORMAT(fp.payment_date, '%Y-%m') = ?", [currentMonthStr])
      .select(
        's.first_name',
        's.last_name',
        's.phone',
        'r.room_number',
        'fp.amount',
        'fp.payment_date',
        'pm.payment_mode_name',
        'fp.transaction_id',
        'fp.notes'
      )
      .orderBy('fp.payment_date', 'desc');

    let totalCollectionsSum = 0;
    let totalCashSum = 0;
    let totalOnlineSum = 0;
    paymentCollections.forEach(p => {
      const amt = Number(p.amount || 0);
      totalCollectionsSum += amt;
      const mode = (p.payment_mode_name || '').toLowerCase();
      if (mode.includes('cash')) totalCashSum += amt;
      else totalOnlineSum += amt;
    });

    // E. Expenses
    const expensesList = await db('expenses as e')
      .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .where('e.hostel_id', hostelId)
      .whereRaw("DATE_FORMAT(e.expense_date, '%Y-%m') = ?", [currentMonthStr])
      .select(
        'e.*',
        'ec.category_name'
      )
      .orderBy('e.expense_date', 'desc');

    let totalExpensesSum = 0;
    expensesList.forEach(e => {
      totalExpensesSum += Number(e.amount || 0);
    });

    // F. Staff & Wages
    let staffList: any[] = [];
    let totalStaffSalarySum = 0;
    try {
      staffList = await db('staff')
        .where('hostel_id', hostelId)
        .select('staff_name', 'role', 'phone', 'salary', 'is_active', 'joining_date')
        .orderBy('is_active', 'desc');
      
      staffList.forEach(st => {
        if (st.is_active) totalStaffSalarySum += Number(st.salary || 0);
      });
    } catch {
      // staff table fallback
    }

    const netBusinessProfit = totalCollectionsSum - (totalExpensesSum + totalStaffSalarySum);

    // =========================================================================
    // SHEET 1: 📊 EXECUTIVE SUMMARY & FINANCIAL OVERVIEW
    // =========================================================================
    const overviewSheet = workbook.addWorksheet('📊 Overview & KPIs', {
      views: [{ showGridLines: true }],
      properties: { defaultRowHeight: 22 },
    });

    // Main Header Title Banner
    overviewSheet.mergeCells('A1:F1');
    const titleCell = overviewSheet.getCell('A1');
    titleCell.value = `🏢  ${hostelName.toUpperCase()} — EXECUTIVE BUSINESS REPORT`;
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLORS.WHITE } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
    overviewSheet.getRow(1).height = 40;

    // Subtitle Banner
    overviewSheet.mergeCells('A2:F2');
    const subCell = overviewSheet.getCell('A2');
    subCell.value = `Month: ${currentMonthStr}   |   Generated: ${generatedAtStr}   |   Owner: ${owner.full_name || 'Owner'} (${owner.email})`;
    subCell.font = { name: 'Calibri', size: 10.5, italic: true, color: { argb: 'FFE2E8F0' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.SLATE_HEADER } };
    overviewSheet.getRow(2).height = 24;

    // Blank row 3
    overviewSheet.getRow(3).height = 12;

    // ─── KPI METRICS CARD 1: OCCUPANCY & CAPACITY ───────────────────────────
    overviewSheet.mergeCells('A4:C4');
    const kpi1Header = overviewSheet.getCell('A4');
    kpi1Header.value = '🛏️  BED OCCUPANCY & TENANTS';
    kpi1Header.font = { size: 11, bold: true, color: { argb: COLORS.WHITE } };
    kpi1Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.INDIGO_ACCENT } };
    kpi1Header.alignment = { vertical: 'middle', indent: 1 };
    overviewSheet.getRow(4).height = 26;

    // ─── KPI METRICS CARD 2: REVENUE & EXPENSES ─────────────────────────────
    overviewSheet.mergeCells('D4:F4');
    const kpi2Header = overviewSheet.getCell('D4');
    kpi2Header.value = '💰  COLLECTIONS, EXPENSES & PROFIT';
    kpi2Header.font = { size: 11, bold: true, color: { argb: COLORS.WHITE } };
    kpi2Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.EMERALD_DARK } };
    kpi2Header.alignment = { vertical: 'middle', indent: 1 };

    const kpiRows = [
      ['Total Active Residents', activeStudentsCount, '', 'Total Collections Received', totalCollectionsSum, '₹#,##0'],
      ['Vacated / Left Residents', leftStudentsCount, '', 'Operating Expenses', totalExpensesSum, '₹#,##0'],
      ['All-Time Enrolled Residents', totalStudentsCount, '', 'Staff Payroll Budget', totalStaffSalarySum, '₹#,##0'],
      ['Total Bed Capacity', totalCapacity, '', 'Net Business Profit / Loss', netBusinessProfit, '₹#,##0'],
      ['Occupied Beds', occupiedBeds, '', 'Cash Collections', totalCashSum, '₹#,##0'],
      ['Available Vacant Beds', availableBeds, '', 'Online / UPI Collections', totalOnlineSum, '₹#,##0'],
      ['Overall Bed Occupancy %', `${occupancyRate}%`, '', 'Total Outstanding Dues', totalPendingBalance, '₹#,##0'],
      ['Total Hostel Rooms', allRooms.length, '', 'Paid / Defaulter Tenant Ratio', `${paidRecords.length} Paid / ${pendingRecords.length} Unpaid`, '@'],
    ];

    let kpiRowIndex = 5;
    kpiRows.forEach((row, i) => {
      const r = overviewSheet.getRow(kpiRowIndex);
      r.height = 23;
      const isZebra = i % 2 === 1;
      const bg = isZebra ? COLORS.ZEBRA_BG : COLORS.WHITE;

      // Left Block (A, B)
      r.getCell(1).value = row[0];
      r.getCell(2).value = row[1];
      r.getCell(1).font = { bold: true, size: 10.5, color: { argb: COLORS.NAVY_HEADER } };
      r.getCell(2).font = { bold: true, size: 11, color: { argb: COLORS.INDIGO_ACCENT } };
      r.getCell(2).alignment = { horizontal: 'right' };
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      r.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.WHITE } };

      // Right Block (D, E)
      r.getCell(4).value = row[3];
      r.getCell(5).value = row[4];
      r.getCell(4).font = { bold: true, size: 10.5, color: { argb: COLORS.NAVY_HEADER } };
      r.getCell(5).alignment = { horizontal: 'right' };
      if (typeof row[4] === 'number') {
        r.getCell(5).numFmt = String(row[5] || '₹#,##0');
      }
      r.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      r.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.WHITE } };

      // Color code specific values
      if (row[3] === 'Net Business Profit / Loss') {
        r.getCell(5).font = { bold: true, size: 12, color: { argb: netBusinessProfit >= 0 ? COLORS.EMERALD_DARK : COLORS.ROSE_DARK } };
        r.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: netBusinessProfit >= 0 ? COLORS.EMERALD_LIGHT : COLORS.ROSE_LIGHT } };
        r.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: netBusinessProfit >= 0 ? COLORS.EMERALD_LIGHT : COLORS.ROSE_LIGHT } };
      } else if (row[3] === 'Total Outstanding Dues') {
        r.getCell(5).font = { bold: true, size: 11, color: { argb: COLORS.ROSE_DARK } };
        r.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ROSE_LIGHT } };
        r.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ROSE_LIGHT } };
      } else {
        r.getCell(5).font = { bold: true, size: 11, color: { argb: COLORS.NAVY_HEADER } };
      }

      // Borders
      [1, 2, 4, 5].forEach(col => {
        r.getCell(col).border = thinBorder;
      });

      kpiRowIndex++;
    });

    overviewSheet.columns = [
      { key: 'lbl1', width: 30 },
      { key: 'val1', width: 18 },
      { key: 'sep', width: 4 },
      { key: 'lbl2', width: 32 },
      { key: 'val2', width: 22 },
      { key: 'end', width: 4 },
    ];

    // =========================================================================
    // SHEET 2: 👥 COMPREHENSIVE STUDENT ROSTER (ACTIVE & LEFT)
    // =========================================================================
    const studentSheet = workbook.addWorksheet('👥 Student Roster', {
      views: [{ showGridLines: true, state: 'frozen', ySplit: 2 }],
      properties: { defaultRowHeight: 20 },
    });

    // Sheet Header
    studentSheet.mergeCells('A1:N1');
    const sTitle = studentSheet.getCell('A1');
    sTitle.value = `👥  ${hostelName} — RESIDENT ROSTER (ACTIVE & VACATED)`;
    sTitle.font = { size: 13, bold: true, color: { argb: COLORS.WHITE } };
    sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
    sTitle.alignment = { vertical: 'middle', indent: 1 };
    studentSheet.getRow(1).height = 32;

    const studentHeaders = [
      'Student Name',
      'Mobile Phone',
      'Email Address',
      'Status',
      'Floor',
      'Room No',
      'Bed No',
      'Admission Date',
      'Monthly Rent (₹)',
      'Deposit / Fee (₹)',
      'ID Proof Number',
      'Guardian Name',
      'Guardian Phone',
      'Vacated / Inactive Date'
    ];

    studentSheet.getRow(2).values = studentHeaders;
    studentSheet.getRow(2).height = 26;
    studentSheet.getRow(2).font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };

    for (let c = 1; c <= studentHeaders.length; c++) {
      studentSheet.getCell(2, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.INDIGO_ACCENT } };
      studentSheet.getCell(2, c).alignment = { horizontal: 'center', vertical: 'middle' };
      studentSheet.getCell(2, c).border = thinBorder;
    }

    let sRowIdx = 3;
    let totalRentsCommitted = 0;

    allStudents.forEach((student, idx) => {
      const row = studentSheet.getRow(sRowIdx);
      row.height = 21;
      const isZebra = idx % 2 === 1;
      const bg = student.is_active ? (isZebra ? COLORS.ZEBRA_BG : COLORS.WHITE) : COLORS.ROSE_LIGHT;

      const name = `${student.first_name} ${student.last_name || ''}`.trim();
      const statusText = student.is_active ? 'ACTIVE' : 'LEFT';
      const rent = Number(student.monthly_rent || 0);
      const fee = Number(student.admission_fee || 0);
      if (student.is_active) totalRentsCommitted += rent;

      const admission = student.admission_date ? new Date(student.admission_date).toISOString().split('T')[0] : 'N/A';
      const vacated = student.inactive_date ? new Date(student.inactive_date).toISOString().split('T')[0] : (student.is_active ? '—' : 'N/A');

      row.values = [
        name,
        student.phone || 'N/A',
        student.email || 'N/A',
        statusText,
        student.floor_number !== null && student.floor_number !== undefined ? `Floor ${student.floor_number}` : 'N/A',
        student.room_number ? `Room ${student.room_number}` : 'Unallocated',
        student.bed_number ? `Bed #${student.bed_number}` : 'N/A',
        admission,
        rent,
        fee,
        student.id_proof_number || 'N/A',
        student.guardian_name || 'N/A',
        student.guardian_phone || 'N/A',
        vacated
      ];

      // Alignments & Formats
      row.getCell(4).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(6).alignment = { horizontal: 'center' };
      row.getCell(7).alignment = { horizontal: 'center' };
      row.getCell(8).alignment = { horizontal: 'center' };
      row.getCell(9).alignment = { horizontal: 'right' };
      row.getCell(9).numFmt = '₹#,##0';
      row.getCell(10).alignment = { horizontal: 'right' };
      row.getCell(10).numFmt = '₹#,##0';
      row.getCell(14).alignment = { horizontal: 'center' };

      // Status Pill
      const statusCell = row.getCell(4);
      if (student.is_active) {
        statusCell.font = { bold: true, color: { argb: COLORS.EMERALD_DARK } };
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.EMERALD_LIGHT } };
      } else {
        statusCell.font = { bold: true, color: { argb: COLORS.ROSE_DARK } };
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ROSE_LIGHT } };
      }

      for (let c = 1; c <= studentHeaders.length; c++) {
        if (c !== 4) row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        row.getCell(c).border = thinBorder;
      }

      sRowIdx++;
    });

    // Summary Total Row
    const sSummaryRow = studentSheet.getRow(sRowIdx);
    sSummaryRow.height = 24;
    sSummaryRow.values = [
      `TOTAL: ${activeStudentsCount} Active (${leftStudentsCount} Left)`,
      '', '', '', '', '', '', 'Total Monthly Rent:',
      totalRentsCommitted,
      '', '', '', '', ''
    ];
    sSummaryRow.font = { bold: true, size: 10.5 };
    sSummaryRow.getCell(1).font = { bold: true, color: { argb: COLORS.INDIGO_ACCENT } };
    sSummaryRow.getCell(9).numFmt = '₹#,##0';
    sSummaryRow.getCell(9).font = { bold: true, color: { argb: COLORS.EMERALD_DARK } };

    for (let c = 1; c <= studentHeaders.length; c++) {
      sSummaryRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.INDIGO_LIGHT } };
      sSummaryRow.getCell(c).border = doubleBottomBorder;
    }

    studentSheet.columns = [
      { key: 'name', width: 24 },
      { key: 'phone', width: 16 },
      { key: 'email', width: 24 },
      { key: 'status', width: 12 },
      { key: 'floor', width: 12 },
      { key: 'room', width: 14 },
      { key: 'bed', width: 10 },
      { key: 'admit', width: 15 },
      { key: 'rent', width: 18 },
      { key: 'fee', width: 16 },
      { key: 'idproof', width: 18 },
      { key: 'gname', width: 18 },
      { key: 'gphone', width: 16 },
      { key: 'vacate', width: 18 }
    ];

    // =========================================================================
    // SHEET 3: 🏢 ROOMS & FLOOR OCCUPANCY BREAKDOWN
    // =========================================================================
    const roomSheet = workbook.addWorksheet('🏢 Rooms & Floors', {
      views: [{ showGridLines: true, state: 'frozen', ySplit: 2 }],
      properties: { defaultRowHeight: 20 },
    });

    roomSheet.mergeCells('A1:H1');
    const rTitle = roomSheet.getCell('A1');
    rTitle.value = `🏢  ${hostelName} — FLOOR & ROOM OCCUPANCY DIRECTORY`;
    rTitle.font = { size: 13, bold: true, color: { argb: COLORS.WHITE } };
    rTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
    rTitle.alignment = { vertical: 'middle', indent: 1 };
    roomSheet.getRow(1).height = 32;

    const roomHeaders = [
      'Floor Number',
      'Room Number',
      'Bed Capacity',
      'Occupied Beds',
      'Available Beds',
      'Occupancy %',
      'Room Status',
      'Current Residents (Allocated)'
    ];

    roomSheet.getRow(2).values = roomHeaders;
    roomSheet.getRow(2).height = 26;
    roomSheet.getRow(2).font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };

    for (let c = 1; c <= roomHeaders.length; c++) {
      roomSheet.getCell(2, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.INDIGO_ACCENT } };
      roomSheet.getCell(2, c).alignment = { horizontal: 'center', vertical: 'middle' };
      roomSheet.getCell(2, c).border = thinBorder;
    }

    let rRowIdx = 3;
    allRooms.forEach((room, idx) => {
      const row = roomSheet.getRow(rRowIdx);
      row.height = 21;
      const isZebra = idx % 2 === 1;
      const bg = isZebra ? COLORS.ZEBRA_BG : COLORS.WHITE;

      const cap = Number(room.capacity || 0);
      const occ = Number(room.occupied_beds || 0);
      const avail = Math.max(0, cap - occ);
      const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0;

      // Find residents in this room
      const residents = activeStudentsList
        .filter(s => String(s.room_number) === String(room.room_number))
        .map(s => `${s.first_name} ${s.last_name || ''}`.trim())
        .join(', ');

      let status = 'AVAILABLE';
      let statusColor = COLORS.EMERALD_DARK;
      let statusBg = COLORS.EMERALD_LIGHT;

      if (occ >= cap && cap > 0) {
        status = 'FULL';
        statusColor = COLORS.ROSE_DARK;
        statusBg = COLORS.ROSE_LIGHT;
      } else if (occ > 0) {
        status = 'PARTIAL';
        statusColor = COLORS.AMBER_DARK;
        statusBg = COLORS.AMBER_LIGHT;
      }

      row.values = [
        `Floor ${room.floor_number || 1}`,
        `Room ${room.room_number}`,
        cap,
        occ,
        avail,
        `${pct}%`,
        status,
        residents || '(Vacant / No Active Residents)'
      ];

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'right' };
      row.getCell(4).alignment = { horizontal: 'right' };
      row.getCell(5).alignment = { horizontal: 'right' };
      row.getCell(6).alignment = { horizontal: 'center' };
      row.getCell(7).alignment = { horizontal: 'center' };

      // Status Badge
      const stCell = row.getCell(7);
      stCell.font = { bold: true, color: { argb: statusColor } };
      stCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBg } };

      for (let c = 1; c <= roomHeaders.length; c++) {
        if (c !== 7) row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        row.getCell(c).border = thinBorder;
      }

      rRowIdx++;
    });

    // Summary Row
    const rSummaryRow = roomSheet.getRow(rRowIdx);
    rSummaryRow.height = 24;
    rSummaryRow.values = [
      `TOTAL: ${allRooms.length} Rooms`,
      '',
      totalCapacity,
      occupiedBeds,
      availableBeds,
      `${occupancyRate}%`,
      '',
      `Total Beds: ${totalCapacity} | Occupied: ${occupiedBeds} | Available: ${availableBeds}`
    ];
    rSummaryRow.font = { bold: true, size: 10.5 };
    rSummaryRow.getCell(1).font = { bold: true, color: { argb: COLORS.INDIGO_ACCENT } };

    for (let c = 1; c <= roomHeaders.length; c++) {
      rSummaryRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.INDIGO_LIGHT } };
      rSummaryRow.getCell(c).border = doubleBottomBorder;
    }

    roomSheet.columns = [
      { key: 'floor', width: 15 },
      { key: 'room', width: 15 },
      { key: 'cap', width: 14 },
      { key: 'occ', width: 14 },
      { key: 'avail', width: 14 },
      { key: 'pct', width: 14 },
      { key: 'status', width: 16 },
      { key: 'residents', width: 45 }
    ];

    // =========================================================================
    // SHEET 4: ⏳ PENDING DUES & UNPAID BALANCES (DEFAULTER LEDGER)
    // =========================================================================
    const duesSheet = workbook.addWorksheet('⏳ Pending Dues & Defaulters', {
      views: [{ showGridLines: true, state: 'frozen', ySplit: 2 }],
      properties: { defaultRowHeight: 20 },
    });

    duesSheet.mergeCells('A1:J1');
    const dTitle = duesSheet.getCell('A1');
    dTitle.value = `⏳  ${hostelName} — PENDING RENT DUES & BALANCES (${currentMonthStr})`;
    dTitle.font = { size: 13, bold: true, color: { argb: COLORS.WHITE } };
    dTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
    dTitle.alignment = { vertical: 'middle', indent: 1 };
    duesSheet.getRow(1).height = 32;

    const duesHeaders = [
      'Student Name',
      'Mobile Phone',
      'Room No',
      'Floor',
      'Agreed Rent (₹)',
      'Carry Forward (₹)',
      'Total Due (₹)',
      'Paid Amount (₹)',
      'Outstanding Balance (₹)',
      'Payment Status'
    ];

    duesSheet.getRow(2).values = duesHeaders;
    duesSheet.getRow(2).height = 26;
    duesSheet.getRow(2).font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };

    for (let c = 1; c <= duesHeaders.length; c++) {
      duesSheet.getCell(2, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ROSE_DARK } };
      duesSheet.getCell(2, c).alignment = { horizontal: 'center', vertical: 'middle' };
      duesSheet.getCell(2, c).border = thinBorder;
    }

    let dRowIdx = 3;
    feeRecords.forEach((item, idx) => {
      const row = duesSheet.getRow(dRowIdx);
      row.height = 21;
      const isZebra = idx % 2 === 1;
      const isDefaulter = item.balance > 0;
      const bg = isDefaulter ? COLORS.ROSE_LIGHT : (isZebra ? COLORS.ZEBRA_BG : COLORS.WHITE);

      const name = `${item.first_name} ${item.last_name || ''}`.trim();
      const rent = Number(item.monthly_rent || 0);
      const carry = Number(item.carry_forward || 0);
      const total = Number(item.total_due || 0);
      const paid = Number(item.paid_amount || 0);
      const balance = Number(item.balance || 0);

      row.values = [
        name,
        item.phone || 'N/A',
        item.room_number ? `Room ${item.room_number}` : 'N/A',
        item.floor_number !== null && item.floor_number !== undefined ? `Floor ${item.floor_number}` : 'N/A',
        rent,
        carry,
        total,
        paid,
        balance,
        item.fee_status
      ];

      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(4).alignment = { horizontal: 'center' };
      row.getCell(10).alignment = { horizontal: 'center' };

      for (let col = 5; col <= 9; col++) {
        row.getCell(col).alignment = { horizontal: 'right' };
        row.getCell(col).numFmt = '₹#,##0';
      }

      // Status pill
      const stCell = row.getCell(10);
      if (item.fee_status === 'Fully Paid') {
        stCell.font = { bold: true, color: { argb: COLORS.EMERALD_DARK } };
        stCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.EMERALD_LIGHT } };
      } else if (item.fee_status === 'Partially Paid') {
        stCell.font = { bold: true, color: { argb: COLORS.AMBER_DARK } };
        stCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.AMBER_LIGHT } };
      } else {
        stCell.font = { bold: true, color: { argb: COLORS.ROSE_DARK } };
        stCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ROSE_LIGHT } };
        row.getCell(9).font = { bold: true, color: { argb: COLORS.ROSE_DARK } };
      }

      for (let c = 1; c <= duesHeaders.length; c++) {
        if (c !== 10) row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        row.getCell(c).border = thinBorder;
      }

      dRowIdx++;
    });

    // Summary Row
    const dSummaryRow = duesSheet.getRow(dRowIdx);
    dSummaryRow.height = 24;
    dSummaryRow.values = [
      `TOTAL: ${feeRecords.length} Billings`,
      '', '', '',
      '', '',
      totalBilledRent,
      totalCollectedThisMonth,
      totalPendingBalance,
      `${pendingRecords.length} Defaulters / Unpaid`
    ];
    dSummaryRow.font = { bold: true, size: 10.5 };
    dSummaryRow.getCell(1).font = { bold: true, color: { argb: COLORS.NAVY_HEADER } };
    dSummaryRow.getCell(7).numFmt = '₹#,##0';
    dSummaryRow.getCell(8).numFmt = '₹#,##0';
    dSummaryRow.getCell(8).font = { bold: true, color: { argb: COLORS.EMERALD_DARK } };
    dSummaryRow.getCell(9).numFmt = '₹#,##0';
    dSummaryRow.getCell(9).font = { bold: true, color: { argb: COLORS.ROSE_DARK } };

    for (let c = 1; c <= duesHeaders.length; c++) {
      dSummaryRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.INDIGO_LIGHT } };
      dSummaryRow.getCell(c).border = doubleBottomBorder;
    }

    duesSheet.columns = [
      { key: 'name', width: 24 },
      { key: 'phone', width: 16 },
      { key: 'room', width: 14 },
      { key: 'floor', width: 12 },
      { key: 'rent', width: 16 },
      { key: 'carry', width: 16 },
      { key: 'total', width: 16 },
      { key: 'paid', width: 16 },
      { key: 'bal', width: 20 },
      { key: 'status', width: 18 }
    ];

    // =========================================================================
    // SHEET 5: 💳 PAYMENT COLLECTIONS AUDIT LOG
    // =========================================================================
    const collectionsSheet = workbook.addWorksheet('💳 Collections Ledger', {
      views: [{ showGridLines: true, state: 'frozen', ySplit: 2 }],
      properties: { defaultRowHeight: 20 },
    });

    collectionsSheet.mergeCells('A1:G1');
    const cTitle = collectionsSheet.getCell('A1');
    cTitle.value = `💳  ${hostelName} — PAYMENT COLLECTIONS LEDGER (${currentMonthStr})`;
    cTitle.font = { size: 13, bold: true, color: { argb: COLORS.WHITE } };
    cTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
    cTitle.alignment = { vertical: 'middle', indent: 1 };
    collectionsSheet.getRow(1).height = 32;

    const colHeaders = [
      'Student Name',
      'Mobile Phone',
      'Room No',
      'Amount Paid (₹)',
      'Payment Date',
      'Payment Mode',
      'Transaction Ref / UTR'
    ];

    collectionsSheet.getRow(2).values = colHeaders;
    collectionsSheet.getRow(2).height = 26;
    collectionsSheet.getRow(2).font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };

    for (let c = 1; c <= colHeaders.length; c++) {
      collectionsSheet.getCell(2, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.EMERALD_DARK } };
      collectionsSheet.getCell(2, c).alignment = { horizontal: 'center', vertical: 'middle' };
      collectionsSheet.getCell(2, c).border = thinBorder;
    }

    let cRowIdx = 3;
    paymentCollections.forEach((p, idx) => {
      const row = collectionsSheet.getRow(cRowIdx);
      row.height = 21;
      const isZebra = idx % 2 === 1;
      const bg = isZebra ? COLORS.ZEBRA_BG : COLORS.WHITE;

      const name = `${p.first_name} ${p.last_name || ''}`.trim();
      const amt = Number(p.amount || 0);
      const payDate = p.payment_date ? new Date(p.payment_date).toISOString().split('T')[0] : 'N/A';

      row.values = [
        name,
        p.phone || 'N/A',
        p.room_number ? `Room ${p.room_number}` : 'N/A',
        amt,
        payDate,
        p.payment_mode_name || 'Cash',
        p.transaction_id || 'N/A'
      ];

      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(4).alignment = { horizontal: 'right' };
      row.getCell(4).numFmt = '₹#,##0';
      row.getCell(4).font = { bold: true, color: { argb: COLORS.EMERALD_DARK } };
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(6).alignment = { horizontal: 'center' };

      for (let c = 1; c <= colHeaders.length; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        row.getCell(c).border = thinBorder;
      }

      cRowIdx++;
    });

    // Summary Row
    const cSummaryRow = collectionsSheet.getRow(cRowIdx);
    cSummaryRow.height = 24;
    cSummaryRow.values = [
      `TOTAL: ${paymentCollections.length} Payments Collected`,
      '', '',
      totalCollectionsSum,
      '',
      `Cash: ₹${totalCashSum.toLocaleString('en-IN')} | UPI: ₹${totalOnlineSum.toLocaleString('en-IN')}`,
      ''
    ];
    cSummaryRow.font = { bold: true, size: 10.5 };
    cSummaryRow.getCell(4).numFmt = '₹#,##0';
    cSummaryRow.getCell(4).font = { bold: true, color: { argb: COLORS.EMERALD_DARK }, size: 11 };

    for (let c = 1; c <= colHeaders.length; c++) {
      cSummaryRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.EMERALD_LIGHT } };
      cSummaryRow.getCell(c).border = doubleBottomBorder;
    }

    collectionsSheet.columns = [
      { key: 'name', width: 24 },
      { key: 'phone', width: 16 },
      { key: 'room', width: 14 },
      { key: 'amount', width: 18 },
      { key: 'date', width: 15 },
      { key: 'mode', width: 16 },
      { key: 'txid', width: 35 }
    ];

    // =========================================================================
    // SHEET 6: 📉 OPERATING EXPENSES & STAFF DIRECTORY
    // =========================================================================
    const expSheet = workbook.addWorksheet('📉 Expenses & Staff', {
      views: [{ showGridLines: true }],
      properties: { defaultRowHeight: 20 },
    });

    expSheet.mergeCells('A1:E1');
    const eTitle = expSheet.getCell('A1');
    eTitle.value = `📉  ${hostelName} — OPERATING EXPENSES & STAFF PAYROLL (${currentMonthStr})`;
    eTitle.font = { size: 13, bold: true, color: { argb: COLORS.WHITE } };
    eTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NAVY_HEADER } };
    eTitle.alignment = { vertical: 'middle', indent: 1 };
    expSheet.getRow(1).height = 32;

    // Sub-header for Expenses
    expSheet.mergeCells('A2:E2');
    const expSub = expSheet.getCell('A2');
    expSub.value = 'SECTION 1: OPERATING EXPENSES & MAINTENANCE';
    expSub.font = { size: 11, bold: true, color: { argb: COLORS.WHITE } };
    expSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ROSE_DARK } };
    expSub.alignment = { vertical: 'middle', indent: 1 };
    expSheet.getRow(2).height = 24;

    const expHeaders = ['Expense Title', 'Category', 'Amount (₹)', 'Expense Date', 'Paid By'];
    expSheet.getRow(3).values = expHeaders;
    expSheet.getRow(3).height = 24;
    expSheet.getRow(3).font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };

    for (let c = 1; c <= 5; c++) {
      expSheet.getCell(3, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.SLATE_HEADER } };
      expSheet.getCell(3, c).alignment = { horizontal: 'center', vertical: 'middle' };
      expSheet.getCell(3, c).border = thinBorder;
    }

    let eRowIdx = 4;
    expensesList.forEach((exp, idx) => {
      const row = expSheet.getRow(eRowIdx);
      row.height = 21;
      const isZebra = idx % 2 === 1;
      const bg = isZebra ? COLORS.ZEBRA_BG : COLORS.WHITE;

      const amt = Number(exp.amount || 0);
      const expDate = exp.expense_date ? new Date(exp.expense_date).toISOString().split('T')[0] : 'N/A';

      row.values = [
        exp.description || exp.vendor_name || 'Hostel Expense',
        exp.category_name || 'Maintenance',
        amt,
        expDate,
        exp.vendor_name || 'Hostel Management'
      ];

      row.getCell(3).alignment = { horizontal: 'right' };
      row.getCell(3).numFmt = '₹#,##0';
      row.getCell(3).font = { bold: true, color: { argb: COLORS.ROSE_DARK } };
      row.getCell(4).alignment = { horizontal: 'center' };

      for (let c = 1; c <= 5; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        row.getCell(c).border = thinBorder;
      }

      eRowIdx++;
    });

    // Expenses Total
    const eSummaryRow = expSheet.getRow(eRowIdx);
    eSummaryRow.height = 24;
    eSummaryRow.values = [`TOTAL EXPENSES: ${expensesList.length} Items`, '', totalExpensesSum, '', ''];
    eSummaryRow.font = { bold: true, size: 10.5 };
    eSummaryRow.getCell(3).numFmt = '₹#,##0';
    eSummaryRow.getCell(3).font = { bold: true, color: { argb: COLORS.ROSE_DARK } };

    for (let c = 1; c <= 5; c++) {
      eSummaryRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ROSE_LIGHT } };
      eSummaryRow.getCell(c).border = doubleBottomBorder;
    }

    eRowIdx += 2;

    // Sub-header for Staff
    expSheet.mergeCells(`A${eRowIdx}:E${eRowIdx}`);
    const staffSub = expSheet.getCell(`A${eRowIdx}`);
    staffSub.value = 'SECTION 2: STAFF ROSTER & SALARY PAYROLL';
    staffSub.font = { size: 11, bold: true, color: { argb: COLORS.WHITE } };
    staffSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.INDIGO_ACCENT } };
    staffSub.alignment = { vertical: 'middle', indent: 1 };
    expSheet.getRow(eRowIdx).height = 24;
    eRowIdx++;

    const staffHeaders = ['Staff Name', 'Role / Designation', 'Monthly Salary (₹)', 'Contact Phone', 'Status'];
    expSheet.getRow(eRowIdx).values = staffHeaders;
    expSheet.getRow(eRowIdx).height = 24;
    expSheet.getRow(eRowIdx).font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };

    for (let c = 1; c <= 5; c++) {
      expSheet.getCell(eRowIdx, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.SLATE_HEADER } };
      expSheet.getCell(eRowIdx, c).alignment = { horizontal: 'center', vertical: 'middle' };
      expSheet.getCell(eRowIdx, c).border = thinBorder;
    }
    eRowIdx++;

    staffList.forEach((st, idx) => {
      const row = expSheet.getRow(eRowIdx);
      row.height = 21;
      const isZebra = idx % 2 === 1;
      const bg = isZebra ? COLORS.ZEBRA_BG : COLORS.WHITE;

      const sal = Number(st.salary || 0);

      row.values = [
        st.staff_name || 'Staff Member',
        st.role || 'Staff',
        sal,
        st.phone || 'N/A',
        st.is_active ? 'ACTIVE' : 'INACTIVE'
      ];

      row.getCell(3).alignment = { horizontal: 'right' };
      row.getCell(3).numFmt = '₹#,##0';
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(5).font = { bold: true, color: { argb: st.is_active ? COLORS.EMERALD_DARK : COLORS.ROSE_DARK } };

      for (let c = 1; c <= 5; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        row.getCell(c).border = thinBorder;
      }

      eRowIdx++;
    });

    const stSummaryRow = expSheet.getRow(eRowIdx);
    stSummaryRow.height = 24;
    stSummaryRow.values = [`TOTAL STAFF: ${staffList.length} Members`, '', totalStaffSalarySum, '', ''];
    stSummaryRow.font = { bold: true, size: 10.5 };
    stSummaryRow.getCell(3).numFmt = '₹#,##0';
    stSummaryRow.getCell(3).font = { bold: true, color: { argb: COLORS.INDIGO_ACCENT } };

    for (let c = 1; c <= 5; c++) {
      stSummaryRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.INDIGO_LIGHT } };
      stSummaryRow.getCell(c).border = doubleBottomBorder;
    }

    expSheet.columns = [
      { key: 'title', width: 28 },
      { key: 'cat', width: 22 },
      { key: 'amt', width: 20 },
      { key: 'date', width: 16 },
      { key: 'by', width: 22 }
    ];

    // =========================================================================
    // 4. WRITE BUFFER & SEND VIA SENDGRID
    // =========================================================================
    const buffer = await workbook.xlsx.writeBuffer();

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 28px; color: #1e293b;">
        <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.07);">
          
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 32px 24px; text-align: center; color: #ffffff; border-bottom: 4px solid #4f46e5;">
            <span style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #818cf8; text-transform: uppercase; display: block; margin-bottom: 6px;">HOSTIX MANAGEMENT CLOUD</span>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${hostelName}</h1>
            <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 13px;">Executive Business & Revenue Summary (${dateStr})</p>
          </div>

          <!-- Content Body -->
          <div style="padding: 26px 24px;">
            <p style="margin-top: 0; font-size: 15px; color: #334155;">
              Hello <strong>${owner.full_name || 'Hostel Owner'}</strong>,
            </p>
            <p style="color: #64748b; font-size: 13.5px; line-height: 22px;">
              Your comprehensive multi-tab business spreadsheet for <strong>${hostelName}</strong> has been generated and is attached to this email.
            </p>

            <!-- KPI Summary Cards Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0;">
              
              <!-- Card 1: Collections -->
              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 14px;">
                <span style="font-size: 11px; font-weight: 700; color: #065f46; text-transform: uppercase; display: block; margin-bottom: 4px;">Month Collections</span>
                <span style="font-size: 20px; font-weight: 800; color: #047857;">₹${totalCollectionsSum.toLocaleString('en-IN')}</span>
                <span style="font-size: 11px; color: #059669; display: block; margin-top: 4px;">${paidRecords.length} Tenants Fully Paid</span>
              </div>

              <!-- Card 2: Pending Dues -->
              <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 14px;">
                <span style="font-size: 11px; font-weight: 700; color: #9f1239; text-transform: uppercase; display: block; margin-bottom: 4px;">Outstanding Dues</span>
                <span style="font-size: 20px; font-weight: 800; color: #be123c;">₹${totalPendingBalance.toLocaleString('en-IN')}</span>
                <span style="font-size: 11px; color: #e11d48; display: block; margin-top: 4px;">${pendingRecords.length} Unpaid Defaulters</span>
              </div>

              <!-- Card 3: Occupancy -->
              <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 14px;">
                <span style="font-size: 11px; font-weight: 700; color: #3730a3; text-transform: uppercase; display: block; margin-bottom: 4px;">Bed Occupancy</span>
                <span style="font-size: 20px; font-weight: 800; color: #4f46e5;">${occupancyRate}%</span>
                <span style="font-size: 11px; color: #6366f1; display: block; margin-top: 4px;">${occupiedBeds} / ${totalCapacity} Beds (${availableBeds} Free)</span>
              </div>

              <!-- Card 4: Net Profit -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
                <span style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Net Business Profit</span>
                <span style="font-size: 20px; font-weight: 800; color: ${netBusinessProfit >= 0 ? '#047857' : '#be123c'};">₹${netBusinessProfit.toLocaleString('en-IN')}</span>
                <span style="font-size: 11px; color: #64748b; display: block; margin-top: 4px;">Expenses: ₹${totalExpensesSum.toLocaleString('en-IN')}</span>
              </div>

            </div>

            <!-- Multi-Sheet Notice -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-top: 20px;">
              <h4 style="margin: 0 0 8px 0; font-size: 12.5px; font-weight: 700; color: #1e293b;">📑 What's Included in Your Attached Excel File:</h4>
              <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #64748b; line-height: 20px;">
                <li><strong>Sheet 1:</strong> Overview & Key Business Indicators</li>
                <li><strong>Sheet 2:</strong> Resident Roster (Active & Vacated with Contact & Room info)</li>
                <li><strong>Sheet 3:</strong> Floor & Room Bed Occupancy Breakdown</li>
                <li><strong>Sheet 4:</strong> Defaulters & Pending Rents Ledger</li>
                <li><strong>Sheet 5:</strong> Payment Collections Transaction Log</li>
                <li><strong>Sheet 6:</strong> Operating Expenses & Staff Payroll</li>
              </ul>
            </div>

            <p style="color: #94a3b8; font-size: 11.5px; margin-top: 20px; margin-bottom: 0;">
              💡 <em>This Excel file acts as a complete standalone offline backup of your hostel business.</em>
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 14px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
            © ${now.getFullYear()} Hostix Cloud System • Automated Executive Dispatch
          </div>

        </div>
      </div>
    `;

    const attachment: EmailAttachment = {
      filename: `${hostelName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Master_Report_${dateStr}.xlsx`,
      content: Buffer.from(buffer),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    await sendEmail({
      to: owner.email,
      subject: `📊 ${hostelName} — Executive Master Business Excel Report (${dateStr})`,
      html: emailHtml,
      attachments: [attachment],
      emailType: 'Executive Excel Report',
      hostelId: hostelId,
    });

    console.log(`✅ [ExcelReport] Successfully dispatched Master Multi-Sheet Excel report to ${owner.email}`);
  } catch (error: any) {
    console.error('❌ [ExcelReport] Error building/sending master report:', error);
  }
};
