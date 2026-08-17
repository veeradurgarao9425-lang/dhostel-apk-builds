import ExcelJS from 'exceljs';
import db from '../config/database.js';
import { sendEmail, EmailAttachment } from './email.js';

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

    console.log(`[ExcelReport] Generating Excel Report for ${hostelName} (Month: ${currentMonthStr})...`);

    // 3. Create Workbook & Sheets
    const workbook = new ExcelJS.Workbook();
    
    // Theme colors (Premium Slate/Indigo)
    const PRIMARY_COLOR = 'FF4F46E5'; // Indigo 600
    const ACCENT_COLOR = 'FFF3F4F6'; // Light grey for alternate rows/subheaders
    const SUCCESS_COLOR = 'FF10B981'; // Green
    const WARNING_COLOR = 'FFF59E0B'; // Orange
    const DANGER_COLOR = 'FEF2F2'; // Light Red fill

    // -------------------------------------------------------------
    // SHEET 1: OVERVIEW
    // -------------------------------------------------------------
    const overviewSheet = workbook.addWorksheet('Overview');
    overviewSheet.properties.defaultRowHeight = 22;

    // Header Title
    overviewSheet.mergeCells('A1:D1');
    const headerCell = overviewSheet.getCell('A1');
    headerCell.value = hostelName;
    headerCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
    overviewSheet.getRow(1).height = 35;

    overviewSheet.mergeCells('A2:D2');
    const subheaderCell = overviewSheet.getCell('A2');
    subheaderCell.value = `Daily Business Summary Report - ${dateStr}`;
    subheaderCell.font = { size: 11, italic: true, color: { argb: 'FF4B5563' } };
    subheaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subheaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT_COLOR } };
    overviewSheet.getRow(2).height = 25;

    // Fetch Stats
    // Active Students
    const [activeStudentsCount] = await db('students')
      .where({ hostel_id: hostelId, is_active: 1 })
      .count('student_id as count');
    const activeStudents = Number(activeStudentsCount?.count || 0);

    // Total Students (All time active + inactive)
    const [totalStudentsCount] = await db('students')
      .where({ hostel_id: hostelId })
      .count('student_id as count');
    const totalStudents = Number(totalStudentsCount?.count || 0);

    // Total Rooms & Beds
    const rooms = await db('rooms').where({ hostel_id: hostelId }).select('capacity', 'occupied_beds');
    const totalRooms = rooms.length;
    let totalCapacity = 0;
    let occupiedBeds = 0;
    rooms.forEach(r => {
      totalCapacity += r.capacity;
      occupiedBeds += r.occupied_beds;
    });
    const availableBeds = totalCapacity - occupiedBeds;

    // Collection this month
    const [collectionSum] = await db('fee_payments')
      .where('hostel_id', hostelId)
      .whereRaw("DATE_FORMAT(payment_date, '%Y-%m') = ?", [currentMonthStr])
      .sum('amount as total');
    const monthCollection = Number(collectionSum?.total || 0);

    // Paid / Unpaid counts
    const feeRecords = await db('monthly_fees')
      .where('hostel_id', hostelId)
      .where('fee_month', currentMonthStr);
    
    const totalPaidCount = feeRecords.filter(f => f.fee_status === 'Fully Paid').length;
    const partialPaidCount = feeRecords.filter(f => f.fee_status === 'Partially Paid').length;
    const pendingPaidCount = feeRecords.filter(f => f.fee_status === 'Pending' || f.fee_status === 'Overdue').length;

    const [pendingAmountSum] = await db('monthly_fees')
      .where('hostel_id', hostelId)
      .where('fee_month', currentMonthStr)
      .sum('balance as total');
    const totalPendingAmount = Number(pendingAmountSum?.total || 0);

    // Add overview metrics table
    overviewSheet.getCell('A4').value = 'Metric Summary';
    overviewSheet.getCell('A4').font = { size: 12, bold: true, color: { argb: PRIMARY_COLOR } };

    const metrics = [
      ['Total Active Students (In Hostel)', activeStudents, 'Total Rooms', totalRooms],
      ['Total Bed Capacity', totalCapacity, 'Occupied Beds', occupiedBeds],
      ['Available Beds', availableBeds, 'Occupancy Rate', totalCapacity > 0 ? `${Math.round((occupiedBeds/totalCapacity)*100)}%` : '0%'],
      ['Monthly Collection (INR)', monthCollection, 'Total Pending Rents (INR)', totalPendingAmount],
      ['Fully Paid Tenants', totalPaidCount, 'Partially Paid Tenants', partialPaidCount],
      ['Unpaid/Pending Tenants', pendingPaidCount, 'Total Tenants Billing', feeRecords.length]
    ];

    let rowIdx = 5;
    metrics.forEach(row => {
      overviewSheet.getRow(rowIdx).values = row;
      // Styling
      overviewSheet.getCell(`A${rowIdx}`).font = { bold: true };
      overviewSheet.getCell(`C${rowIdx}`).font = { bold: true };
      overviewSheet.getCell(`B${rowIdx}`).alignment = { horizontal: 'right' };
      overviewSheet.getCell(`D${rowIdx}`).alignment = { horizontal: 'right' };
      rowIdx++;
    });

    // Formatting widths
    overviewSheet.columns = [
      { key: 'metric1', width: 32 },
      { key: 'val1', width: 15 },
      { key: 'metric2', width: 28 },
      { key: 'val2', width: 15 }
    ];

    // Add borders to metrics block
    for (let r = 5; r < rowIdx; r++) {
      for (let c = 1; c <= 4; c++) {
        const cell = overviewSheet.getCell(r, c);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      }
    }


    // -------------------------------------------------------------
    // SHEET 2: STUDENT DIRECTORY
    // -------------------------------------------------------------
    const studentSheet = workbook.addWorksheet('Student Directory');
    studentSheet.properties.defaultRowHeight = 20;

    studentSheet.getRow(1).values = ['Student Directory - Active & Allocated'];
    studentSheet.getRow(1).font = { size: 14, bold: true, color: { argb: PRIMARY_COLOR } };
    studentSheet.getRow(2).values = ['Name', 'Phone', 'Status', 'Room Number', 'Monthly Rent (₹)', 'Admission Date'];
    studentSheet.getRow(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    studentSheet.getRow(2).height = 25;
    for (let col = 1; col <= 6; col++) {
      studentSheet.getCell(2, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
      studentSheet.getCell(2, col).alignment = { horizontal: 'center', vertical: 'middle' };
    }

    const studentsList = await db('students as s')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .where('s.hostel_id', hostelId)
      .select('s.first_name', 's.last_name', 's.phone', 's.is_active', 'r.room_number', 's.monthly_rent', 's.admission_date')
      .orderBy('r.room_number', 'asc')
      .orderBy('s.first_name', 'asc');

    let studentRowIdx = 3;
    studentsList.forEach(student => {
      const name = `${student.first_name} ${student.last_name || ''}`.trim();
      const statusText = student.is_active ? 'Active' : 'Inactive';
      const roomNum = student.room_number || 'Not Allocated';
      const rent = Number(student.monthly_rent || 0);
      const admission = student.admission_date ? new Date(student.admission_date).toISOString().split('T')[0] : 'N/A';

      studentSheet.getRow(studentRowIdx).values = [
        name,
        student.phone || 'N/A',
        statusText,
        roomNum,
        rent,
        admission
      ];

      // Format cells
      studentSheet.getCell(`C${studentRowIdx}`).alignment = { horizontal: 'center' };
      studentSheet.getCell(`D${studentRowIdx}`).alignment = { horizontal: 'center' };
      studentSheet.getCell(`E${studentRowIdx}`).alignment = { horizontal: 'right' };
      studentSheet.getCell(`E${studentRowIdx}`).numFmt = '₹#,##0';
      studentSheet.getCell(`F${studentRowIdx}`).alignment = { horizontal: 'center' };

      // Highlight active status
      if (student.is_active) {
        studentSheet.getCell(`C${studentRowIdx}`).font = { color: { argb: 'FF047857' }, bold: true }; // Emerald 700
      } else {
        studentSheet.getCell(`C${studentRowIdx}`).font = { color: { argb: 'FFB91C1C' } }; // Red 700
      }

      studentRowIdx++;
    });

    studentSheet.columns = [
      { key: 'name', width: 25 },
      { key: 'phone', width: 16 },
      { key: 'status', width: 12 },
      { key: 'room', width: 16 },
      { key: 'rent', width: 18 },
      { key: 'admission', width: 16 }
    ];


    // -------------------------------------------------------------
    // SHEET 3: DUES & PAYMENT STATUS (CURRENT MONTH)
    // -------------------------------------------------------------
    const duesSheet = workbook.addWorksheet('Current Month Rents & Dues');
    duesSheet.properties.defaultRowHeight = 20;

    duesSheet.getRow(1).values = [`Dues & Payments for Month: ${currentMonthStr}`];
    duesSheet.getRow(1).font = { size: 14, bold: true, color: { argb: PRIMARY_COLOR } };
    duesSheet.getRow(2).values = ['Student Name', 'Monthly Rent (₹)', 'Carry Forward (₹)', 'Total Due (₹)', 'Paid Amount (₹)', 'Balance Dues (₹)', 'Payment Status', 'Due Date'];
    duesSheet.getRow(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    duesSheet.getRow(2).height = 25;
    for (let col = 1; col <= 8; col++) {
      duesSheet.getCell(2, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
      duesSheet.getCell(2, col).alignment = { horizontal: 'center', vertical: 'middle' };
    }

    const duesList = await db('monthly_fees as mf')
      .join('students as s', 'mf.student_id', 's.student_id')
      .where('mf.hostel_id', hostelId)
      .where('mf.fee_month', currentMonthStr)
      .select('s.first_name', 's.last_name', 'mf.monthly_rent', 'mf.carry_forward', 'mf.total_due', 'mf.paid_amount', 'mf.balance', 'mf.fee_status', 'mf.due_date')
      .orderBy('mf.balance', 'desc')
      .orderBy('s.first_name', 'asc');

    let duesRowIdx = 3;
    duesList.forEach(item => {
      const name = `${item.first_name} ${item.last_name || ''}`.trim();
      const rent = Number(item.monthly_rent || 0);
      const carry = Number(item.carry_forward || 0);
      const total = Number(item.total_due || 0);
      const paid = Number(item.paid_amount || 0);
      const balance = Number(item.balance || 0);
      const dueDate = item.due_date ? new Date(item.due_date).toISOString().split('T')[0] : 'N/A';

      duesSheet.getRow(duesRowIdx).values = [
        name,
        rent,
        carry,
        total,
        paid,
        balance,
        item.fee_status,
        dueDate
      ];

      // Formatting
      for (let col = 2; col <= 6; col++) {
        duesSheet.getCell(duesRowIdx, col).alignment = { horizontal: 'right' };
        duesSheet.getCell(duesRowIdx, col).numFmt = '₹#,##0';
      }
      duesSheet.getCell(`G${duesRowIdx}`).alignment = { horizontal: 'center' };
      duesSheet.getCell(`H${duesRowIdx}`).alignment = { horizontal: 'center' };

      // Colors for status
      const statusCell = duesSheet.getCell(`G${duesRowIdx}`);
      if (item.fee_status === 'Fully Paid') {
        statusCell.font = { color: { argb: 'FF047857' }, bold: true };
      } else if (item.fee_status === 'Partially Paid') {
        statusCell.font = { color: { argb: 'FFD97706' }, bold: true };
      } else {
        statusCell.font = { color: { argb: 'FFB91C1C' }, bold: true };
        // Highlight background of unpaid rows
        for (let col = 1; col <= 8; col++) {
          duesSheet.getCell(duesRowIdx, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DANGER_COLOR } };
        }
      }

      duesRowIdx++;
    });

    duesSheet.columns = [
      { key: 'name', width: 25 },
      { key: 'rent', width: 16 },
      { key: 'carry', width: 16 },
      { key: 'total', width: 16 },
      { key: 'paid', width: 16 },
      { key: 'balance', width: 16 },
      { key: 'status', width: 15 },
      { key: 'duedate', width: 15 }
    ];


    // -------------------------------------------------------------
    // SHEET 4: COLLECTIONS LOG (CURRENT MONTH)
    // -------------------------------------------------------------
    const collectionsSheet = workbook.addWorksheet('Collections Log');
    collectionsSheet.properties.defaultRowHeight = 20;

    collectionsSheet.getRow(1).values = [`Rent Payments Collected in ${currentMonthStr}`];
    collectionsSheet.getRow(1).font = { size: 14, bold: true, color: { argb: PRIMARY_COLOR } };
    collectionsSheet.getRow(2).values = ['Student Name', 'Amount Paid (₹)', 'Payment Date', 'Payment Mode', 'Transaction ID', 'Notes'];
    collectionsSheet.getRow(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    collectionsSheet.getRow(2).height = 25;
    for (let col = 1; col <= 6; col++) {
      collectionsSheet.getCell(2, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
      collectionsSheet.getCell(2, col).alignment = { horizontal: 'center', vertical: 'middle' };
    }

    const collectionsList = await db('fee_payments as fp')
      .join('students as s', 'fp.student_id', 's.student_id')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .where('fp.hostel_id', hostelId)
      .whereRaw("DATE_FORMAT(fp.payment_date, '%Y-%m') = ?", [currentMonthStr])
      .select('s.first_name', 's.last_name', 'fp.amount', 'fp.payment_date', 'pm.payment_mode_name', 'fp.transaction_id', 'fp.notes')
      .orderBy('fp.payment_date', 'desc');

    let colRowIdx = 3;
    collectionsList.forEach(payment => {
      const name = `${payment.first_name} ${payment.last_name || ''}`.trim();
      const amount = Number(payment.amount || 0);
      const payDate = payment.payment_date ? new Date(payment.payment_date).toISOString().split('T')[0] : 'N/A';

      collectionsSheet.getRow(colRowIdx).values = [
        name,
        amount,
        payDate,
        payment.payment_mode_name || 'N/A',
        payment.transaction_id || 'N/A',
        payment.notes || ''
      ];

      // Formatting
      collectionsSheet.getCell(`B${colRowIdx}`).alignment = { horizontal: 'right' };
      collectionsSheet.getCell(`B${colRowIdx}`).numFmt = '₹#,##0';
      collectionsSheet.getCell(`C${colRowIdx}`).alignment = { horizontal: 'center' };
      collectionsSheet.getCell(`D${colRowIdx}`).alignment = { horizontal: 'center' };

      colRowIdx++;
    });

    collectionsSheet.columns = [
      { key: 'name', width: 25 },
      { key: 'amount', width: 18 },
      { key: 'date', width: 16 },
      { key: 'mode', width: 16 },
      { key: 'txid', width: 20 },
      { key: 'notes', width: 30 }
    ];


    // 4. Generate Workbook Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 5. Send Report Email
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6; padding: 30px; color: #1f2937;">
        <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
          
          <!-- Banner Header -->
          <div style="background-color: #4f46e5; padding: 35px; text-align: center; color: #ffffff;">
            <span style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #c7d2fe; display: block; margin-bottom: 8px;">Automated Report</span>
            <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">${hostelName} Summary</h1>
          </div>

          <!-- Content Body -->
          <div style="padding: 30px; line-height: 1.6;">
            <p style="margin-top: 0; font-size: 16px; color: #374151;">Hello <strong>${owner.full_name || 'Owner'}</strong>,</p>
            <p style="color: #4b5563; font-size: 15px;">
              Your requested daily business report and student dues excel sheet for <strong>${hostelName}</strong> has been successfully generated.
            </p>
            
            <!-- Metrics Summary Cards -->
            <div style="background-color: #f9fafb; border-radius: 10px; padding: 20px; border: 1px solid #f3f4f6; margin: 25px 0;">
              <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #4f46e5; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px;">Key Indicators (Today)</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Total Active Tenants</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #111827;">${activeStudents}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Occupancy Beds</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #111827;">${occupiedBeds} / ${totalCapacity} (${totalCapacity > 0 ? Math.round((occupiedBeds/totalCapacity)*100) : 0}%)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">This Month's Collections</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #059669;">₹${monthCollection.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Total Pending / Unpaid Balance</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #dc2626;">₹${totalPendingAmount.toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </div>

            <p style="color: #4b5563; font-size: 14px;">
              Please find the complete breakdown attached in the Excel sheet (<strong>${hostelName.replace(/\s+/g, '_')}_Report_${dateStr}.xlsx</strong>).
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
            <p style="margin: 0 0 4px 0;">This email is sent automatically by the Hostix System when you log in.</p>
            <p style="margin: 0;">© ${now.getFullYear()} Hostix Hostel Management. All rights reserved.</p>
          </div>

        </div>
      </div>
    `;

    const attachment: EmailAttachment = {
      filename: `${hostelName.replace(/\s+/g, '_')}_Report_${dateStr}.xlsx`,
      content: Buffer.from(buffer),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    await sendEmail({
      to: owner.email,
      subject: `📊 Daily Business Excel Report - ${hostelName} - ${dateStr}`,
      html: emailHtml,
      attachments: [attachment],
      emailType: 'Daily Business Report',
      hostelId: hostelId
    });

    console.log(`[ExcelReport] Excel Report email successfully sent to ${owner.email}`);

  } catch (error: any) {
    console.error('[ExcelReport] Error generating and sending daily report:', error);
  }
};
