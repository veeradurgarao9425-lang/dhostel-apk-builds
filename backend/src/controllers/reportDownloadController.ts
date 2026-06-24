// @ts-nocheck
import { Response } from 'express';
import { Writable } from 'stream';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { sendEmail } from '../utils/email.js';

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Generate PDF Report
export const downloadPDFReport = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.query; // Format: YYYY-MM (e.g., 2026-01)
    const user = req.user;

    if (!month || typeof month !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Month parameter is required (format: YYYY-MM)'
      });
    }

    // Parse month
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0); // Last day of the month

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get hostel info
    let hostelIds: number[] = [];
    let hostelName = 'All Hostels';

    if ((user?.role_id === 2 || (user?.role_id === 1 && user?.hostel_id))) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostelIds = [user.hostel_id];
      
      const hostel = await db('hostel_master')
        .where('hostel_id', user.hostel_id)
        .first();
      if (hostel) {
        hostelName = hostel.hostel_name || 'Hostel';
      }
    } else if (user?.role_id !== 1) {
      return res.status(403).json({
        success: false,
        error: 'This feature is only available for Hostel Owners and Admins.'
      });
    }

    // Fetch income records
    const incomes = db('income as i')
      .leftJoin('payment_modes as pm', 'i.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'i.income_date',
        'i.amount',
        'i.source',
        'pm.payment_mode_name as payment_mode',
        'i.receipt_number',
        'i.description'
      )
      .whereBetween('i.income_date', [startDateStr, endDateStr])
      .orderBy('i.income_date', 'asc');

    if (hostelIds.length > 0) {
      incomes.whereIn('i.hostel_id', hostelIds);
    }

    const incomesData = await incomes;

    // Fetch expense records
    const expenses = db('expenses as e')
      .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .leftJoin('payment_modes as pm', 'e.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'e.expense_date',
        'e.amount',
        'ec.category_name',
        'pm.payment_mode_name as payment_mode',
        'e.bill_number',
        'e.vendor_name',
        'e.description'
      )
      .whereBetween('e.expense_date', [startDateStr, endDateStr])
      .orderBy('e.expense_date', 'asc');

    if (hostelIds.length > 0) {
      expenses.whereIn('e.hostel_id', hostelIds);
    }

    const expensesData = await expenses;

    // Merge in short-stay guest income + staff wages so exports reconcile with Overview
    try {
      let gq = db('guests')
        .select('check_in_date as income_date', 'amount_paid as amount', 'full_name', 'purpose')
        .where('amount_paid', '>', 0)
        .whereBetween('check_in_date', [startDateStr, endDateStr]);
      if (hostelIds.length > 0) gq = gq.whereIn('hostel_id', hostelIds);
      const guestData = await gq;
      guestData.forEach((g: any) => incomesData.push({
        income_date: g.income_date,
        amount: g.amount,
        source: 'Guest Stay',
        payment_mode: 'Cash',
        receipt_number: null,
        description: g.purpose ? `${g.full_name} — ${g.purpose}` : g.full_name,
      }));
    } catch (e) { /* guests table may not exist */ }

    try {
      let wq = db('staff_payments as sp')
        .leftJoin('staff as st', 'sp.staff_id', 'st.staff_id')
        .select('sp.payment_date as expense_date', 'sp.amount', 'sp.note', 'st.full_name')
        .whereBetween('sp.payment_date', [startDateStr, endDateStr]);
      if (hostelIds.length > 0) wq = wq.whereIn('sp.hostel_id', hostelIds);
      const wageData = await wq;
      wageData.forEach((w: any) => expensesData.push({
        expense_date: w.expense_date,
        amount: w.amount,
        category_name: 'Staff Wages',
        payment_mode: 'Cash',
        bill_number: null,
        vendor_name: w.full_name || 'Staff',
        description: w.note || 'Wage payment',
      }));
    } catch (e) { /* staff_payments table may not exist */ }

    // Calculate totals
    const totalIncome = incomesData.reduce((sum, inc) => sum + Number(inc.amount || 0), 0);
    const totalExpenses = expensesData.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;

    // Month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[monthNum - 1];

    // Create PDF with proper margins
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      layout: 'portrait'
    });
    const filename = `Income_Expense_Report_${monthName}_${year}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Page dimensions
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);

    // Header Section
    doc.fontSize(20).font('Helvetica-Bold').text(hostelName, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).font('Helvetica-Bold').text('Income & Expense Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text(`${monthName} ${year}`, { align: 'center' });
    doc.moveDown(2);

    // Summary Section with Box
    const summaryY = doc.y;
    doc.rect(margin, summaryY, contentWidth, 80)
       .strokeColor('#333333')
       .lineWidth(1)
       .stroke();
    
    doc.fontSize(14).font('Helvetica-Bold').text('Summary', margin + 10, summaryY + 10);
    doc.moveDown(1);
    
    doc.fontSize(11).font('Helvetica');
    doc.text('Total Income:', margin + 20, doc.y, { width: 150 });
    doc.text(formatCurrency(totalIncome), margin + 170, doc.y, { width: 150, align: 'right' });
    doc.moveDown(1);
    
    doc.text('Total Expenses:', margin + 20, doc.y, { width: 150 });
    doc.text(formatCurrency(totalExpenses), margin + 170, doc.y, { width: 150, align: 'right' });
    doc.moveDown(1);
    
    doc.font('Helvetica-Bold');
    doc.text('Net Profit/Loss:', margin + 20, doc.y, { width: 150 });
    doc.text(formatCurrency(netProfit), margin + 170, doc.y, { width: 150, align: 'right' });
    
    doc.y = summaryY + 80 + 20;

    // Income Details Section
    doc.fontSize(14).font('Helvetica-Bold').text('Income Details', margin);
    doc.moveDown(0.5);
    
    if (incomesData.length === 0) {
      doc.fontSize(10).font('Helvetica').text('No income records found for this month.', margin + 10);
      doc.moveDown(1);
    } else {
      // Table header
      const tableTop = doc.y;
      const rowHeight = 20;
      const colWidths = [80, 120, 100, 100, 100]; // Date, Source, Amount, Payment Mode, Receipt
      let xPos = margin;
      
      // Header row background
      doc.rect(xPos, tableTop, contentWidth, rowHeight)
         .fillColor('#E0E0E0')
         .fill();
      
      // Header text
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
      xPos = margin + 5;
      doc.text('Date', xPos, tableTop + 5, { width: colWidths[0] - 10 });
      xPos += colWidths[0];
      doc.text('Source', xPos, tableTop + 5, { width: colWidths[1] - 10 });
      xPos += colWidths[1];
      doc.text('Amount', xPos, tableTop + 5, { width: colWidths[2] - 10, align: 'right' });
      xPos += colWidths[2];
      doc.text('Payment Mode', xPos, tableTop + 5, { width: colWidths[3] - 10 });
      xPos += colWidths[3];
      doc.text('Receipt #', xPos, tableTop + 5, { width: colWidths[4] - 10 });
      
      // Header border
      doc.strokeColor('#333333').lineWidth(1)
         .moveTo(margin, tableTop + rowHeight)
         .lineTo(margin + contentWidth, tableTop + rowHeight)
         .stroke();
      
      let currentY = tableTop + rowHeight;
      
      // Data rows
      incomesData.forEach((income: any, index: number) => {
        if (currentY + rowHeight > pageHeight - margin - 50) {
          doc.addPage();
          currentY = margin;
        }
        
        xPos = margin + 5;
        doc.fontSize(9).font('Helvetica').fillColor('#000000');
        
        doc.text(formatDate(income.income_date), xPos, currentY + 5, { width: colWidths[0] - 10 });
        xPos += colWidths[0];
        doc.text((income.source || '-').substring(0, 20), xPos, currentY + 5, { width: colWidths[1] - 10 });
        xPos += colWidths[1];
        doc.text(formatCurrency(Number(income.amount || 0)), xPos, currentY + 5, { width: colWidths[2] - 10, align: 'right' });
        xPos += colWidths[2];
        doc.text((income.payment_mode || '-').substring(0, 15), xPos, currentY + 5, { width: colWidths[3] - 10 });
        xPos += colWidths[3];
        doc.text((income.receipt_number || '-').substring(0, 15), xPos, currentY + 5, { width: colWidths[4] - 10 });
        
        // Row border
        doc.strokeColor('#CCCCCC').lineWidth(0.5)
           .moveTo(margin, currentY + rowHeight)
           .lineTo(margin + contentWidth, currentY + rowHeight)
           .stroke();
        
        currentY += rowHeight;
      });
      
      doc.y = currentY + 10;
    }

    // Check if we need a new page for expenses
    if (doc.y > pageHeight - 200) {
      doc.addPage();
    }

    // Expense Details Section
    doc.fontSize(14).font('Helvetica-Bold').text('Expense Details', margin);
    doc.moveDown(0.5);
    
    if (expensesData.length === 0) {
      doc.fontSize(10).font('Helvetica').text('No expense records found for this month.', margin + 10);
    } else {
      // Table header
      const tableTop = doc.y;
      const rowHeight = 20;
      const colWidths = [80, 120, 100, 100, 100]; // Date, Category, Amount, Payment Mode, Bill #
      let xPos = margin;
      
      // Header row background
      doc.rect(xPos, tableTop, contentWidth, rowHeight)
         .fillColor('#E0E0E0')
         .fill();
      
      // Header text
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
      xPos = margin + 5;
      doc.text('Date', xPos, tableTop + 5, { width: colWidths[0] - 10 });
      xPos += colWidths[0];
      doc.text('Category', xPos, tableTop + 5, { width: colWidths[1] - 10 });
      xPos += colWidths[1];
      doc.text('Amount', xPos, tableTop + 5, { width: colWidths[2] - 10, align: 'right' });
      xPos += colWidths[2];
      doc.text('Payment Mode', xPos, tableTop + 5, { width: colWidths[3] - 10 });
      xPos += colWidths[3];
      doc.text('Bill #', xPos, tableTop + 5, { width: colWidths[4] - 10 });
      
      // Header border
      doc.strokeColor('#333333').lineWidth(1)
         .moveTo(margin, tableTop + rowHeight)
         .lineTo(margin + contentWidth, tableTop + rowHeight)
         .stroke();
      
      let currentY = tableTop + rowHeight;
      
      // Data rows
      expensesData.forEach((expense: any) => {
        if (currentY + rowHeight > pageHeight - margin - 50) {
          doc.addPage();
          currentY = margin;
        }
        
        xPos = margin + 5;
        doc.fontSize(9).font('Helvetica').fillColor('#000000');
        
        doc.text(formatDate(expense.expense_date), xPos, currentY + 5, { width: colWidths[0] - 10 });
        xPos += colWidths[0];
        doc.text((expense.category_name || '-').substring(0, 20), xPos, currentY + 5, { width: colWidths[1] - 10 });
        xPos += colWidths[1];
        doc.text(formatCurrency(Number(expense.amount || 0)), xPos, currentY + 5, { width: colWidths[2] - 10, align: 'right' });
        xPos += colWidths[2];
        doc.text((expense.payment_mode || '-').substring(0, 15), xPos, currentY + 5, { width: colWidths[3] - 10 });
        xPos += colWidths[3];
        doc.text((expense.bill_number || '-').substring(0, 15), xPos, currentY + 5, { width: colWidths[4] - 10 });
        
        // Row border
        doc.strokeColor('#CCCCCC').lineWidth(0.5)
           .moveTo(margin, currentY + rowHeight)
           .lineTo(margin + contentWidth, currentY + rowHeight)
           .stroke();
        
        currentY += rowHeight;
      });
    }

    // Footer on last page
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).font('Helvetica').fillColor('#666666')
         .text(
           `Generated on ${formatDate(new Date().toISOString())} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} | Page ${i + 1} of ${pageCount}`,
           margin,
           pageHeight - 30,
           { align: 'center', width: contentWidth }
         );
    }

    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF report'
    });
  }
};

// Generate Excel Report
export const downloadExcelReport = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.query; // Format: YYYY-MM (e.g., 2026-01)
    const user = req.user;

    if (!month || typeof month !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Month parameter is required (format: YYYY-MM)'
      });
    }

    // Parse month
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0); // Last day of the month

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get hostel info
    let hostelIds: number[] = [];
    let hostelName = 'All Hostels';

    if ((user?.role_id === 2 || (user?.role_id === 1 && user?.hostel_id))) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostelIds = [user.hostel_id];
      
      const hostel = await db('hostel_master')
        .where('hostel_id', user.hostel_id)
        .first();
      if (hostel) {
        hostelName = hostel.hostel_name || 'Hostel';
      }
    } else if (user?.role_id !== 1) {
      return res.status(403).json({
        success: false,
        error: 'This feature is only available for Hostel Owners and Admins.'
      });
    }

    // 1. Fetch Income records (Other Income)
    const incomes = db('income as i')
      .leftJoin('payment_modes as pm', 'i.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'i.income_date',
        'i.amount',
        'i.source',
        'pm.payment_mode_name as payment_mode',
        'i.receipt_number',
        'i.description'
      )
      .whereBetween('i.income_date', [startDateStr, endDateStr])
      .orderBy('i.income_date', 'asc');

    if (hostelIds.length > 0) incomes.whereIn('i.hostel_id', hostelIds);
    const incomesData = await incomes;

    // 2. Fetch Expense records
    const expenses = db('expenses as e')
      .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .leftJoin('payment_modes as pm', 'e.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'e.expense_date',
        'e.amount',
        'ec.category_name',
        'pm.payment_mode_name as payment_mode',
        'e.bill_number',
        'e.vendor_name',
        'e.description'
      )
      .whereBetween('e.expense_date', [startDateStr, endDateStr])
      .orderBy('e.expense_date', 'asc');

    if (hostelIds.length > 0) expenses.whereIn('e.hostel_id', hostelIds);
    const expensesData = await expenses;

    // Merge in short-stay guest income + staff wages so the export reconciles with Overview
    try {
      let gq = db('guests')
        .select('check_in_date as income_date', 'amount_paid as amount', 'full_name', 'purpose')
        .where('amount_paid', '>', 0)
        .whereBetween('check_in_date', [startDateStr, endDateStr]);
      if (hostelIds.length > 0) gq = gq.whereIn('hostel_id', hostelIds);
      (await gq).forEach((g: any) => incomesData.push({
        income_date: g.income_date,
        amount: g.amount,
        source: 'Guest Stay',
        payment_mode: 'Cash',
        receipt_number: null,
        description: g.purpose ? `${g.full_name} — ${g.purpose}` : g.full_name,
      }));
    } catch (e) { /* guests table may not exist */ }

    try {
      let wq = db('staff_payments as sp')
        .leftJoin('staff as st', 'sp.staff_id', 'st.staff_id')
        .select('sp.payment_date as expense_date', 'sp.amount', 'sp.note', 'st.full_name')
        .whereBetween('sp.payment_date', [startDateStr, endDateStr]);
      if (hostelIds.length > 0) wq = wq.whereIn('sp.hostel_id', hostelIds);
      (await wq).forEach((w: any) => expensesData.push({
        expense_date: w.expense_date,
        amount: w.amount,
        category_name: 'Staff Wages',
        payment_mode: 'Cash',
        bill_number: null,
        vendor_name: w.full_name || 'Staff',
        description: w.note || 'Wage payment',
      }));
    } catch (e) { /* staff_payments table may not exist */ }

    // 3. Fetch Student (Tenant) records
    const students = db('students as s')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .select(
        's.first_name',
        's.last_name',
        's.phone',
        's.email',
        's.admission_date',
        's.status as is_active',
        'r.room_number',
        db.raw('NULL as bed_number'),
        's.guardian_name',
        's.guardian_phone',
        's.permanent_address'
      )
      .orderBy('s.first_name', 'asc');

    if (hostelIds.length > 0) students.whereIn('s.hostel_id', hostelIds);
    const studentsData = await students;

    // 4. Fetch Fee Payments (Fee Collections)
    const payments = db('fee_payments as fp')
      .join('students as s', 'fp.student_id', 's.student_id')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .leftJoin('monthly_fees as mf', 'fp.fee_id', 'mf.fee_id')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .select(
        'fp.payment_date',
        's.first_name',
        's.last_name',
        'r.room_number',
        'fp.amount as amount_paid',
        'pm.payment_mode_name as payment_mode',
        'mf.fee_month as payment_for_month',
        'fp.transaction_id as transaction_reference',
        'fp.receipt_number',
        'fp.notes as remarks'
      )
      .whereBetween('fp.payment_date', [startDateStr, endDateStr])
      .orderBy('fp.payment_date', 'asc');

    if (hostelIds.length > 0) payments.whereIn('fp.hostel_id', hostelIds);
    const paymentsData = await payments;

    // 5. Fetch Rooms list
    const roomsList = db('rooms as r')
      .leftJoin('room_types as rt', 'r.room_type_id', 'rt.room_type_id')
      .select(
        'r.room_number',
        'rt.room_type_name',
        'r.floor_number',
        'r.capacity',
        'r.occupied_beds',
        'r.rent_per_bed',
        'r.is_available',
        'r.amenities'
      )
      .orderBy('r.room_number', 'asc');

    if (hostelIds.length > 0) roomsList.whereIn('r.hostel_id', hostelIds);
    const roomsListData = await roomsList;

    // Calculate totals
    const feeIncome = paymentsData.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
    const otherIncomeVal = incomesData.reduce((sum, inc) => sum + Number(inc.amount || 0), 0);
    const totalIncome = feeIncome + otherIncomeVal;
    const totalExpenses = expensesData.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;

    const totalRooms = roomsListData.length;
    const totalCapacity = roomsListData.reduce((sum, rm) => sum + (rm.capacity || 0), 0);
    const occupiedBeds = roomsListData.reduce((sum, rm) => sum + (rm.occupied_beds || 0), 0);
    const availableBeds = totalCapacity - occupiedBeds;
    const occupancyRate = totalCapacity > 0 ? ((occupiedBeds / totalCapacity) * 100).toFixed(1) : '0';

    // Month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[monthNum - 1];

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();

    // -------------------------------------------------------------
    // SHEET 1: SUMMARY
    // -------------------------------------------------------------
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.properties.defaultRowHeight = 20;

    // Header styling helper
    const applyMainHeader = (sheet: ExcelJS.Worksheet, title: string) => {
      sheet.mergeCells('A1:G1');
      const cell = sheet.getCell('A1');
      cell.value = hostelName;
      cell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo 600
      sheet.getRow(1).height = 30;

      sheet.mergeCells('A2:G2');
      const subtitleCell = sheet.getCell('A2');
      subtitleCell.value = `${title} - ${monthName} ${year}`;
      subtitleCell.font = { size: 13, bold: true, color: { argb: 'FF1F2937' } };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      sheet.getRow(2).height = 22;
    };

    applyMainHeader(summarySheet, 'Financial & Occupancy Summary');

    let rIdx = 4;
    
    // Summary Cards block
    summarySheet.getCell(`A${rIdx}`).value = 'Financial Metrics';
    summarySheet.getCell(`A${rIdx}`).font = { size: 12, bold: true };
    rIdx++;

    const finLabels = [
      ['Fee Collections (Rent)', feeIncome],
      ['Other Income', otherIncomeVal],
      ['TOTAL MONTHLY INCOME', totalIncome],
      ['TOTAL MONTHLY EXPENSES', totalExpenses],
      ['NET PROFIT / LOSS', netProfit]
    ];

    finLabels.forEach(([lbl, val], idx) => {
      summarySheet.getRow(rIdx).height = 20;
      const cellA = summarySheet.getCell(`A${rIdx}`);
      const cellB = summarySheet.getCell(`B${rIdx}`);
      cellA.value = lbl;
      cellB.value = val;
      cellB.numFmt = '₹#,##0.00';

      const isHighlight = idx === 2 || idx === 3 || idx === 4;
      const font = { size: 11, bold: isHighlight, color: { argb: isHighlight ? 'FF1E1B4B' : 'FF374151' } };
      cellA.font = font;
      cellB.font = font;

      if (idx === 4) {
        // Net profit styling (green bg if positive, red if negative)
        const isProfit = (val as number) >= 0;
        const colorBg = isProfit ? 'FFD1FAE5' : 'FFFEE2E2'; // light green vs light red
        cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorBg } };
        cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorBg } };
      }
      rIdx++;
    });

    rIdx += 2;

    summarySheet.getCell(`A${rIdx}`).value = 'Occupancy Metrics';
    summarySheet.getCell(`A${rIdx}`).font = { size: 12, bold: true };
    rIdx++;

    const occLabels = [
      ['Total Rooms', totalRooms],
      ['Total Bed Capacity', totalCapacity],
      ['Occupied Beds', occupiedBeds],
      ['Available Beds', availableBeds],
      ['Occupancy Rate', `${occupancyRate}%`]
    ];

    occLabels.forEach(([lbl, val]) => {
      summarySheet.getRow(rIdx).height = 20;
      const cellA = summarySheet.getCell(`A${rIdx}`);
      const cellB = summarySheet.getCell(`B${rIdx}`);
      cellA.value = lbl;
      cellB.value = val;
      cellA.font = { size: 11, color: { argb: 'FF374151' } };
      cellB.font = { size: 11, bold: true, color: { argb: 'FF374151' } };
      rIdx++;
    });

    summarySheet.getColumn('A').width = 28;
    summarySheet.getColumn('B').width = 20;

    // -------------------------------------------------------------
    // SHEET 2: TENANTS
    // -------------------------------------------------------------
    const tenantSheet = workbook.addWorksheet('Tenants');
    applyMainHeader(tenantSheet, 'Active & Inactive Tenants List');

    const tenantHeaders = ['S.No', 'Full Name', 'Phone', 'Email', 'Admission Date', 'Room No', 'Bed No', 'Guardian Name', 'Guardian Phone', 'Status'];
    tenantSheet.getRow(4).height = 24;
    
    tenantHeaders.forEach((h, idx) => {
      const cell = tenantSheet.getCell(4, idx + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let trIdx = 5;
    studentsData.forEach((s, idx) => {
      tenantSheet.getRow(trIdx).height = 20;
      tenantSheet.getCell(`A${trIdx}`).value = idx + 1;
      tenantSheet.getCell(`B${trIdx}`).value = `${s.first_name || ''} ${s.last_name || ''}`.trim();
      tenantSheet.getCell(`C${trIdx}`).value = s.phone || '-';
      tenantSheet.getCell(`D${trIdx}`).value = s.email || '-';
      
      const dateVal = s.admission_date ? new Date(s.admission_date) : null;
      if (dateVal) {
        tenantSheet.getCell(`E${trIdx}`).value = dateVal;
        tenantSheet.getCell(`E${trIdx}`).numFmt = 'dd/mm/yyyy';
      } else {
        tenantSheet.getCell(`E${trIdx}`).value = '-';
      }
      
      tenantSheet.getCell(`F${trIdx}`).value = s.room_number || 'Unallocated';
      tenantSheet.getCell(`G${trIdx}`).value = s.bed_number || '-';
      tenantSheet.getCell(`H${trIdx}`).value = s.guardian_name || '-';
      tenantSheet.getCell(`I${trIdx}`).value = s.guardian_phone || '-';
      
      const isActive = s.is_active === 1 || s.is_active === true;
      tenantSheet.getCell(`J${trIdx}`).value = isActive ? 'Active' : 'Inactive';
      tenantSheet.getCell(`J${trIdx}`).font = { bold: true, color: { argb: isActive ? 'FF047857' : 'FFB91C1C' } }; // green vs red

      // Border and Center alignment
      for (let col = 1; col <= 10; col++) {
        const cell = tenantSheet.getCell(trIdx, col);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFECEFf4' } },
          bottom: { style: 'thin', color: { argb: 'FFECEFf4' } }
        };
        if (col === 1 || col === 3 || col === 5 || col === 6 || col === 7 || col === 9 || col === 10) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
      trIdx++;
    });

    tenantSheet.getColumn('A').width = 6;
    tenantSheet.getColumn('B').width = 22;
    tenantSheet.getColumn('C').width = 15;
    tenantSheet.getColumn('D').width = 22;
    tenantSheet.getColumn('E').width = 15;
    tenantSheet.getColumn('F').width = 14;
    tenantSheet.getColumn('G').width = 10;
    tenantSheet.getColumn('H').width = 20;
    tenantSheet.getColumn('I').width = 15;
    tenantSheet.getColumn('J').width = 12;

    // -------------------------------------------------------------
    // SHEET 3: FEE PAYMENTS
    // -------------------------------------------------------------
    const paymentSheet = workbook.addWorksheet('Fee Payments');
    applyMainHeader(paymentSheet, 'Monthly Fee Payments & Collections');

    const paymentHeaders = ['S.No', 'Payment Date', 'Tenant Name', 'Room No', 'Amount Paid', 'Payment Mode', 'For Month', 'Transaction Ref', 'Receipt Number', 'Remarks'];
    paymentSheet.getRow(4).height = 24;
    
    paymentHeaders.forEach((h, idx) => {
      const cell = paymentSheet.getCell(4, idx + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }; // Green 600
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let prIdx = 5;
    paymentsData.forEach((p, idx) => {
      paymentSheet.getRow(prIdx).height = 20;
      paymentSheet.getCell(`A${prIdx}`).value = idx + 1;
      
      const dateVal = p.payment_date ? new Date(p.payment_date) : null;
      if (dateVal) {
        paymentSheet.getCell(`B${prIdx}`).value = dateVal;
        paymentSheet.getCell(`B${prIdx}`).numFmt = 'dd/mm/yyyy';
      } else {
        paymentSheet.getCell(`B${prIdx}`).value = '-';
      }

      paymentSheet.getCell(`C${prIdx}`).value = `${p.first_name || ''} ${p.last_name || ''}`.trim();
      paymentSheet.getCell(`D${prIdx}`).value = p.room_number || '-';
      
      paymentSheet.getCell(`E${prIdx}`).value = Number(p.amount_paid || 0);
      paymentSheet.getCell(`E${prIdx}`).numFmt = '₹#,##0.00';
      paymentSheet.getCell(`E${prIdx}`).font = { bold: true };

      paymentSheet.getCell(`F${prIdx}`).value = p.payment_mode || 'Cash';
      paymentSheet.getCell(`G${prIdx}`).value = p.payment_for_month || '-';
      paymentSheet.getCell(`H${prIdx}`).value = p.transaction_reference || '-';
      paymentSheet.getCell(`I${prIdx}`).value = p.receipt_number || '-';
      paymentSheet.getCell(`J${prIdx}`).value = p.remarks || '-';

      // Border & Alignment
      for (let col = 1; col <= 10; col++) {
        const cell = paymentSheet.getCell(prIdx, col);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFECEFf4' } },
          bottom: { style: 'thin', color: { argb: 'FFECEFf4' } }
        };
        if (col === 1 || col === 2 || col === 4 || col === 6 || col === 7 || col === 8 || col === 9) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (col === 5) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
      prIdx++;
    });

    paymentSheet.getColumn('A').width = 6;
    paymentSheet.getColumn('B').width = 15;
    paymentSheet.getColumn('C').width = 22;
    paymentSheet.getColumn('D').width = 12;
    paymentSheet.getColumn('E').width = 15;
    paymentSheet.getColumn('F').width = 15;
    paymentSheet.getColumn('G').width = 15;
    paymentSheet.getColumn('H').width = 18;
    paymentSheet.getColumn('I').width = 18;
    paymentSheet.getColumn('J').width = 25;

    // -------------------------------------------------------------
    // SHEET 4: ROOMS & BEDS
    // -------------------------------------------------------------
    const roomSheet = workbook.addWorksheet('Rooms & Occupancy');
    applyMainHeader(roomSheet, 'Rooms Capacity & Occupancy Status');

    const roomHeaders = ['S.No', 'Room Number', 'Room Type', 'Floor', 'Bed Capacity', 'Occupied Beds', 'Available Beds', 'Rent per Bed', 'Amenities', 'Status'];
    roomSheet.getRow(4).height = 24;
    
    roomHeaders.forEach((h, idx) => {
      const cell = roomSheet.getCell(4, idx + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // Blue 600
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let rmrIdx = 5;
    roomsListData.forEach((r, idx) => {
      roomSheet.getRow(rmrIdx).height = 20;
      roomSheet.getCell(`A${rmrIdx}`).value = idx + 1;
      roomSheet.getCell(`B${rmrIdx}`).value = r.room_number;
      roomSheet.getCell(`C${rmrIdx}`).value = r.room_type_name || 'Standard';
      roomSheet.getCell(`D${rmrIdx}`).value = r.floor_number !== null ? `Floor ${r.floor_number}` : '-';
      roomSheet.getCell(`E${rmrIdx}`).value = r.capacity || 0;
      roomSheet.getCell(`F${rmrIdx}`).value = r.occupied_beds || 0;
      
      const avBeds = (r.capacity || 0) - (r.occupied_beds || 0);
      roomSheet.getCell(`G${rmrIdx}`).value = avBeds >= 0 ? avBeds : 0;
      
      roomSheet.getCell(`H${rmrIdx}`).value = Number(r.rent_per_bed || 0);
      roomSheet.getCell(`H${rmrIdx}`).numFmt = '₹#,##0.00';

      roomSheet.getCell(`I${rmrIdx}`).value = r.amenities || '-';
      
      const isAvailable = r.is_available === 1 || r.is_available === true;
      const statusText = avBeds === 0 ? 'Full' : (isAvailable ? 'Available' : 'Unavailable');
      roomSheet.getCell(`J${rmrIdx}`).value = statusText;
      roomSheet.getCell(`J${rmrIdx}`).font = { 
        bold: true, 
        color: { argb: avBeds === 0 ? 'FFB91C1C' : (isAvailable ? 'FF047857' : 'FF94A3B8') } 
      };

      // Border & Alignment
      for (let col = 1; col <= 10; col++) {
        const cell = roomSheet.getCell(rmrIdx, col);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFECEFf4' } },
          bottom: { style: 'thin', color: { argb: 'FFECEFf4' } }
        };
        if (col === 1 || col === 2 || col === 4 || col === 5 || col === 6 || col === 7 || col === 10) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (col === 8) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
      rmrIdx++;
    });

    roomSheet.getColumn('A').width = 6;
    roomSheet.getColumn('B').width = 15;
    roomSheet.getColumn('C').width = 15;
    roomSheet.getColumn('D').width = 12;
    roomSheet.getColumn('E').width = 14;
    roomSheet.getColumn('F').width = 14;
    roomSheet.getColumn('G').width = 14;
    roomSheet.getColumn('H').width = 15;
    roomSheet.getColumn('I').width = 25;
    roomSheet.getColumn('J').width = 14;

    // -------------------------------------------------------------
    // SHEET 5: EXPENSES
    // -------------------------------------------------------------
    const expenseSheet = workbook.addWorksheet('Expenses');
    applyMainHeader(expenseSheet, 'Detailed Expenses Breakdown');

    const expenseHeadersList = ['S.No', 'Expense Date', 'Category', 'Amount', 'Payment Mode', 'Bill Number', 'Vendor Name', 'Description'];
    expenseSheet.getRow(4).height = 24;
    
    expenseHeadersList.forEach((h, idx) => {
      const cell = expenseSheet.getCell(4, idx + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } }; // Orange 600
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let exrIdx = 5;
    expenses.forEach((e, idx) => {
      expenseSheet.getRow(exrIdx).height = 20;
      expenseSheet.getCell(`A${exrIdx}`).value = idx + 1;
      
      const dateVal = e.expense_date ? new Date(e.expense_date) : null;
      if (dateVal) {
        expenseSheet.getCell(`B${exrIdx}`).value = dateVal;
        expenseSheet.getCell(`B${exrIdx}`).numFmt = 'dd/mm/yyyy';
      } else {
        expenseSheet.getCell(`B${exrIdx}`).value = '-';
      }

      expenseSheet.getCell(`C${exrIdx}`).value = e.category_name || 'Miscellaneous';
      
      expenseSheet.getCell(`D${exrIdx}`).value = Number(e.amount || 0);
      expenseSheet.getCell(`D${exrIdx}`).numFmt = '₹#,##0.00';
      expenseSheet.getCell(`D${exrIdx}`).font = { bold: true, color: { argb: 'FFDC2626' } }; // Red text for expenses

      expenseSheet.getCell(`E${exrIdx}`).value = e.payment_mode || 'Cash';
      expenseSheet.getCell(`F${exrIdx}`).value = e.bill_number || '-';
      expenseSheet.getCell(`G${exrIdx}`).value = e.vendor_name || '-';
      expenseSheet.getCell(`H${exrIdx}`).value = e.description || '-';

      // Border & Alignment
      for (let col = 1; col <= 8; col++) {
        const cell = expenseSheet.getCell(exrIdx, col);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFECEFf4' } },
          bottom: { style: 'thin', color: { argb: 'FFECEFf4' } }
        };
        if (col === 1 || col === 2 || col === 5 || col === 6) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (col === 4) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
      exrIdx++;
    });

    expenseSheet.getColumn('A').width = 6;
    expenseSheet.getColumn('B').width = 15;
    expenseSheet.getColumn('C').width = 18;
    expenseSheet.getColumn('D').width = 15;
    expenseSheet.getColumn('E').width = 15;
    expenseSheet.getColumn('F').width = 15;
    expenseSheet.getColumn('G').width = 20;
    expenseSheet.getColumn('H').width = 25;

    // Set response headers
    const filename = `Hostel_Financial_Report_${monthName}_${year}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Excel report'
    });
  }
};

// Generate the same Excel report and EMAIL it to the logged-in user's address.
// Reuses downloadExcelReport by capturing its streamed output into a buffer via
// a mock response — no duplication of the (large) workbook-building logic.
export const emailExcelReport = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const toEmail = user?.email;

    // The app auto-generates placeholder emails (...@dhostel.com) for phone-only
    // signups — those can't receive mail, so require a real address.
    if (!toEmail || /@dhostel\.com$/i.test(toEmail)) {
      return res.status(400).json({
        success: false,
        error: 'No valid email address is set on your account. Please add your email in Profile first.',
      });
    }

    // Capture the .xlsx bytes that downloadExcelReport streams to `res`.
    const chunks: Buffer[] = [];
    let filename = 'Hostel_Financial_Report.xlsx';
    let earlyError: { code: number; body: any } | null = null;

    const mock: any = new Writable({
      write(chunk: any, _enc: any, cb: any) {
        chunks.push(Buffer.from(chunk));
        cb();
      },
    });
    mock.setHeader = (key: string, value: string) => {
      if (String(key).toLowerCase() === 'content-disposition') {
        const m = /filename="([^"]+)"/.exec(value);
        if (m) filename = m[1];
      }
      return mock;
    };
    mock.status = (code: number) => ({
      json: (body: any) => {
        earlyError = { code, body };
        return mock;
      },
    });

    await downloadExcelReport(req, mock);

    if (earlyError) {
      return res.status(earlyError.code).json(earlyError.body);
    }

    const buffer = Buffer.concat(chunks);
    if (!buffer.length) {
      return res.status(500).json({ success: false, error: 'Failed to generate the report.' });
    }

    const reportTitle = filename.replace(/\.xlsx$/i, '').replace(/_/g, ' ');
    await sendEmail({
      to: toEmail,
      subject: `Your Hostel Report — ${reportTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1A1A2E;">
          <h2 style="color: #5F2EEA; margin-bottom: 8px;">Your Hostel Report is ready</h2>
          <p>Hello ${user?.full_name || 'Owner'},</p>
          <p>Your hostel financial report (<strong>${reportTitle}</strong>) is attached to this email as an Excel spreadsheet.</p>
          <p style="color: #6B6B8A; font-size: 13px; margin-top: 24px;">— Hostix Hostel Management</p>
        </div>`,
      attachments: [
        {
          filename,
          content: buffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    });

    return res.json({ success: true, message: `Report emailed to ${toEmail}` });
  } catch (error: any) {
    console.error('Email Excel report error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to email the report. Please try again.',
    });
  }
};
