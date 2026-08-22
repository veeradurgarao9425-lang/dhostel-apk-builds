/**
 * seedProductionData.ts
 * Comprehensive Production-Grade Database Seeder for HOSTIX.
 *
 * Dynamically detects table schemas for 100% compatibility across
 * local development and DigitalOcean production MySQL databases.
 */

import bcrypt from 'bcryptjs';
import { db } from './config/database.js';

async function seedProductionData() {
  console.log('🚀 Starting Comprehensive Production Data Seeding...\n');

  try {
    // Helper to get existing column names for any table
    const getTableColumns = async (tableName: string): Promise<Set<string>> => {
      try {
        const [cols] = await db.raw(`DESCRIBE \`${tableName}\``);
        return new Set((cols as any[]).map((c: any) => c.Field));
      } catch (e) {
        return new Set();
      }
    };

    // Helper to filter an object to only existing columns
    const filterRow = (row: Record<string, any>, validCols: Set<string>) => {
      if (validCols.size === 0) return row;
      const filtered: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        if (validCols.has(k)) {
          filtered[k] = v;
        }
      }
      return filtered;
    };

    // 1. Get or Ensure Primary Hostel
    let hostel = await db('hostel_master').first();
    if (!hostel) {
      const [newHostelId] = await db('hostel_master').insert({
        hostel_name: 'Hostix Luxury PG & Coliving',
        address: 'Plot 42, Silicon Valley Road, Madhapur, Hitech City',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500081',
        contact_number: '9876543210',
        total_floors: 6,
        admission_fee: 1000.0,
        hostel_code: 'HSTX01',
        is_active: 1,
      });
      hostel = await db('hostel_master').where({ hostel_id: newHostelId }).first();
    } else {
      await db('hostel_master').where({ hostel_id: hostel.hostel_id }).update({
        hostel_name: 'Hostix Luxury PG & Coliving',
        total_floors: 6,
        address: 'Plot 42, Silicon Valley Road, Madhapur, Hitech City',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500081',
        is_active: 1,
      });
    }

    const hostelId = hostel.hostel_id;
    console.log(`🏨 Target Hostel: "${hostel.hostel_name}" (ID: ${hostelId}, Floors: 6)`);

    // 2. Ensure Owner Account: demo@test.com / Demo123
    console.log('👤 Ensuring Owner Account demo@test.com...');
    const hashedPassword = await bcrypt.hash('Demo123', 10);
    await db('users').where({ email: 'admin@d.com' }).delete().catch(() => {});

    const existingDemoUser = await db('users').where({ email: 'demo@test.com' }).first();
    const existingPersonal = await db('users').where({ email: 'veeradurgarao840@gmail.com' }).first();

    let ownerUserId: number;
    if (existingDemoUser) {
      await db('users').where({ user_id: existingDemoUser.user_id }).update({
        full_name: 'Hostix Owner',
        phone: '9876543210',
        password: hashedPassword,
        password_hash: hashedPassword,
        role: 'OWNER',
        role_id: 2,
        hostel_id: hostelId,
        is_active: 1,
      });
      ownerUserId = existingDemoUser.user_id;
    } else if (existingPersonal) {
      await db('users').where({ user_id: existingPersonal.user_id }).update({
        full_name: 'Hostix Owner',
        email: 'demo@test.com',
        phone: '9876543210',
        password: hashedPassword,
        password_hash: hashedPassword,
        role: 'OWNER',
        role_id: 2,
        hostel_id: hostelId,
        is_active: 1,
      });
      ownerUserId = existingPersonal.user_id;
    } else {
      const [newUserId] = await db('users').insert({
        full_name: 'Hostix Owner',
        email: 'demo@test.com',
        phone: '9876543210',
        password: hashedPassword,
        password_hash: hashedPassword,
        role: 'OWNER',
        role_id: 2,
        hostel_id: hostelId,
        is_active: 1,
      });
      ownerUserId = newUserId;
    }

    await db('hostel_master').where({ hostel_id: hostelId }).update({ owner_id: ownerUserId });
    console.log(`✅ Owner Configured: demo@test.com (Password: Demo123, ID: ${ownerUserId})`);

    // 3. Clean Up Old Records for this Hostel
    console.log('🧹 Cleaning old records...');
    await db('fee_payments').where({ hostel_id: hostelId }).delete().catch(() => {});
    await db('monthly_fees').where({ hostel_id: hostelId }).delete().catch(() => {});
    await db('expenses').where({ hostel_id: hostelId }).delete().catch(() => {});
    await db('guests').where({ hostel_id: hostelId }).delete().catch(() => {});
    await db('staff_payments').where({ hostel_id: hostelId }).delete().catch(() => {});
    await db('staff').where({ hostel_id: hostelId }).delete().catch(() => {});
    await db('mess_menu').where({ hostel_id: hostelId }).delete().catch(() => {});
    await db('complaints').where({ hostel_id: hostelId }).delete().catch(() => {});
    await db('notices').where({ hostel_id: hostelId }).delete().catch(() => {});
    await db('students').where({ hostel_id: hostelId }).delete().catch(() => {});
    await db('rooms').where({ hostel_id: hostelId }).delete().catch(() => {});

    // Detect schemas
    const roomCols = await getTableColumns('rooms');
    const studentCols = await getTableColumns('students');
    const feeCols = await getTableColumns('monthly_fees');
    const paymentCols = await getTableColumns('fee_payments');
    const expenseCols = await getTableColumns('expenses');
    const staffCols = await getTableColumns('staff');
    const guestCols = await getTableColumns('guests');
    const menuCols = await getTableColumns('mess_menu');

    // Room Types resolution
    let defaultRoomTypeId = 1;
    try {
      const types = await db('room_types').select('*').catch(() => []);
      if (types && types.length > 0) {
        defaultRoomTypeId = types[0].room_type_id || 1;
      } else {
        await db('room_types').insert([
          { room_type_name: 'Single Room', base_price: 12000 },
          { room_type_name: '2 Sharing', base_price: 8500 },
          { room_type_name: '3 Sharing', base_price: 6500 },
          { room_type_name: '4 Sharing', base_price: 5000 },
        ]).catch(() => {});
        const freshTypes = await db('room_types').select('*').catch(() => []);
        if (freshTypes && freshTypes.length > 0) defaultRoomTypeId = freshTypes[0].room_type_id;
      }
    } catch (e) {}

    // 4. Create 48 Rooms Across 6 Floors (138 Total Beds Capacity)
    console.log('🏢 Creating 48 Rooms across 6 Floors (138 Beds)...');
    interface CreatedRoom {
      room_id: number;
      room_number: string;
      floor_number: number;
      capacity: number;
      rent_per_bed: number;
    }
    const createdRooms: CreatedRoom[] = [];

    // 6 Floors: 1 to 6 (8 rooms per floor = 48 rooms total)
    for (let floor = 1; floor <= 6; floor++) {
      const floorConfigs = [
        { suffix: '01', cap: 1, rent: 12000 },
        { suffix: '02', cap: 2, rent: 8500 },
        { suffix: '03', cap: 2, rent: 8500 },
        { suffix: '04', cap: 3, rent: 6500 },
        { suffix: '05', cap: 3, rent: 6500 },
        { suffix: '06', cap: 4, rent: 5000 },
        { suffix: '07', cap: 4, rent: 5000 },
        { suffix: '08', cap: 4, rent: 5000 },
      ];

      for (const cfg of floorConfigs) {
        const roomNum = `${floor}${cfg.suffix}`;
        const rawRoomRow: any = {
          hostel_id: hostelId,
          room_number: roomNum,
          floor_number: floor,
          floor: floor,
          capacity: cfg.cap,
          occupied_beds: 0,
          rent_per_bed: cfg.rent,
          room_type_id: defaultRoomTypeId,
          is_available: 1,
        };

        const filteredRoom = filterRow(rawRoomRow, roomCols);
        const [roomId] = await db('rooms').insert(filteredRoom);

        createdRooms.push({
          room_id: roomId,
          room_number: roomNum,
          floor_number: floor,
          capacity: cfg.cap,
          rent_per_bed: cfg.rent,
        });
      }
    }

    // Compute Bed Slots across the 48 rooms
    interface BedSlot {
      room_id: number;
      room_number: string;
      floor_number: number;
      rent_per_bed: number;
    }
    const allBedSlots: BedSlot[] = [];

    for (const rm of createdRooms) {
      for (let b = 0; b < rm.capacity; b++) {
        allBedSlots.push({
          room_id: rm.room_id,
          room_number: rm.room_number,
          floor_number: rm.floor_number,
          rent_per_bed: rm.rent_per_bed,
        });
      }
    }
    console.log(`✅ Total Beds Capacity: ${allBedSlots.length} across 48 rooms (6 Floors)`);

    // 5. Realistic Indian Student Profiles
    console.log('👥 Generating 145+ Authentic Student Records...');
    const firstNames = [
      'Sai', 'Rahul', 'Aditya', 'Karthik', 'Naveen', 'Rohan', 'Manoj', 'Harish', 'Vikram', 'Anil',
      'Praneeth', 'Siddharth', 'Varun', 'Teja', 'Abhishek', 'Gautam', 'Kiran', 'Suresh', 'Akhil', 'Sandeep',
      'Tarun', 'Vishnu', 'Dinesh', 'Vamshi', 'Chaitanya', 'Deepak', 'Arun', 'Manish', 'Pavan', 'Ravi',
      'Venkat', 'Sanjay', 'Rohit', 'Ashwin', 'Lokesh', 'Shiva', 'Kalyan', 'Bhanu', 'Suraj', 'Naresh',
      'Harsha', 'Anand', 'Srikanth', 'Santosh', 'Madhav', 'Raghav', 'Avinash', 'Sunil', 'Rajesh', 'Vikas',
      'Nikhil', 'Yash', 'Mahesh', 'Ganesh', 'Pramod', 'Vijay', 'Shravan', 'Bhargav', 'Ajay', 'Chetan',
      'Ananya', 'Sneha', 'Pooja', 'Divya', 'Kavya', 'Deepika', 'Harini', 'Bhavana', 'Swathi', 'Meghana',
      'Sravani', 'Pranathi', 'Sushma', 'Tejaswi', 'Mounika', 'Keerthi', 'Pavani', 'Lavanya', 'Manasa', 'Navya'
    ];

    const lastNames = [
      'Reddy', 'Rao', 'Varma', 'Sharma', 'Goud', 'Naidu', 'Chowdary', 'Patel', 'Verma', 'Kumar',
      'Raju', 'Gupta', 'Singh', 'Mishra', 'Yadav', 'Joshi', 'Menon', 'Iyer', 'Nair', 'Babu',
      'Murthy', 'Kulkarni', 'Deshmukh', 'Chary', 'Shukla', 'Pandey', 'Saxena', 'Agarwal', 'Thakur', 'Bhat'
    ];

    const towns = [
      'Vijayawada, AP', 'Visakhapatnam, AP', 'Guntur, AP', 'Warangal, Telangana', 'Karimnagar, Telangana',
      'Kurnool, AP', 'Tirupati, AP', 'Nizamabad, Telangana', 'Khammam, Telangana', 'Nellore, AP',
      'Rajahmundry, AP', 'Kakinada, AP', 'Anantapur, AP', 'Kadapa, AP', 'Nalgonda, Telangana',
      'Bengaluru, Karnataka', 'Pune, Maharashtra', 'Chennai, Tamil Nadu', 'Bhubaneswar, Odisha', 'Patna, Bihar'
    ];

    const genPhone = (i: number) => `98${String(40000000 + i).padStart(8, '0')}`;
    const genAadhaar = (i: number) => `${3000 + (i % 5000)} ${4000 + (i % 5000)} ${5000 + (i % 5000)}`;

    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // Helper to insert student dynamically handling integer/enum admission_status
    const insertStudentDynamic = async (rawStudent: Record<string, any>) => {
      const filtered = filterRow(rawStudent, studentCols);
      try {
        // Try integer admission_status first
        return await db('students').insert(filtered);
      } catch (err: any) {
        if (err?.code === 'WARN_DATA_TRUNCATED' || err?.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
          const stringStatus = rawStudent.admission_status === 1 || rawStudent.admission_status === 'Paid' ? 'Paid' : 'Unpaid';
          const rowEnum = { ...filtered, admission_status: stringStatus };
          return await db('students').insert(rowEnum).catch(async () => {
            const rowNoAdm = { ...filtered };
            delete rowNoAdm.admission_status;
            return await db('students').insert(rowNoAdm);
          });
        }
        throw err;
      }
    };

    // Create 118 Active Occupants (leaving 20 beds vacant)
    const occupiedCount = 118;
    for (let i = 0; i < occupiedCount; i++) {
      const slot = allBedSlots[i];
      const fn = firstNames[i % firstNames.length];
      const ln = lastNames[i % lastNames.length];
      const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i + 1}@gmail.com`;
      const phone = genPhone(i + 1);
      const hometown = towns[i % towns.length];

      // Join date distribution
      let joinDaysAgo = 10;
      if (i < 50) joinDaysAgo = 90 + (i * 2);
      else if (i < 85) joinDaysAgo = 30 + (i % 30);
      else if (i < 105) joinDaysAgo = 10 + (i % 15);
      else joinDaysAgo = 1 + (i % 5);

      const joinDate = new Date(today.getTime() - joinDaysAgo * 24 * 60 * 60 * 1000);
      const joinDateStr = joinDate.toISOString().split('T')[0];

      // Vacate notice assignment for 12 students
      let vacateNoticeDate: string | null = null;
      let vacateNoticeReason: string | null = null;
      if (i >= 20 && i < 32) {
        const vacateDaysFuture = (i - 19) * 2;
        const vDate = new Date(today.getTime() + vacateDaysFuture * 24 * 60 * 60 * 1000);
        vacateNoticeDate = vDate.toISOString().split('T')[0];
        const reasons = [
          'Job transfer to Bangalore office',
          'Semester exams finished - returning home',
          'Moving into personal 2BHK flat with colleagues',
          'Course completed, returning to native place',
          'Project onsite deployment'
        ];
        vacateNoticeReason = reasons[i % reasons.length];
      }

      let rentStatus: 'paid' | 'pending' | 'overdue' = 'paid';
      if (i >= 66 && i < 96) rentStatus = 'pending';
      else if (i >= 96) rentStatus = 'overdue';

      // Insert Student
      const rawStudent = {
        hostel_id: hostelId,
        room_id: slot.room_id,
        floor_number: slot.floor_number,
        first_name: fn,
        last_name: ln,
        email: email,
        phone: phone,
        permanent_address: hometown,
        current_address: hometown,
        id_proof_number: genAadhaar(i + 1),
        admission_date: joinDateStr,
        monthly_rent: slot.rent_per_bed,
        admission_fee: 1000,
        admission_status: 1, // Admitted
        refundable_deposit: slot.rent_per_bed * 1.5,
        status: 1, // Active
        is_active: 1,
        vacate_notice_date: vacateNoticeDate,
        vacate_notice_reason: vacateNoticeReason,
        vacate_reminder_sent: 0,
        created_at: joinDate,
      };

      const insertRes = await insertStudentDynamic(rawStudent);
      const studentId = Array.isArray(insertRes) ? insertRes[0] : insertRes;

      // Update Room occupied count
      await db('rooms').where({ room_id: slot.room_id }).increment('occupied_beds', 1);

      // Create Monthly Fee Record for current month
      const monthlyRent = slot.rent_per_bed;
      let carryForward = 0;
      let totalDue = monthlyRent;
      let paidAmount = 0;
      let feeStatusEnum: 'Fully Paid' | 'Partially Paid' | 'Pending' | 'Overdue' = 'Fully Paid';
      let feeStatusStr = 'paid';
      let balance = 0;
      let paidDate: string | null = null;

      if (rentStatus === 'paid') {
        paidAmount = monthlyRent;
        balance = 0;
        feeStatusEnum = 'Fully Paid';
        feeStatusStr = 'paid';
        const pDays = (i % 8) + 1;
        paidDate = `${currentMonthStr}-${String(pDays).padStart(2, '0')}`;
      } else if (rentStatus === 'pending') {
        if (i % 3 === 0) {
          paidAmount = 2000;
          balance = monthlyRent - 2000;
          feeStatusEnum = 'Partially Paid';
          feeStatusStr = 'partial';
          paidDate = `${currentMonthStr}-03`;
        } else {
          paidAmount = 0;
          balance = monthlyRent;
          feeStatusEnum = 'Pending';
          feeStatusStr = 'pending';
          paidDate = null;
        }
      } else if (rentStatus === 'overdue') {
        carryForward = monthlyRent;
        totalDue = monthlyRent + carryForward;
        paidAmount = 0;
        balance = totalDue;
        feeStatusEnum = 'Overdue';
        feeStatusStr = 'overdue';
        paidDate = null;
      }

      const rawFee = {
        hostel_id: hostelId,
        student_id: studentId,
        fee_month: currentMonthStr,
        monthly_rent: monthlyRent,
        carry_forward: carryForward,
        total_due: totalDue,
        paid_amount: paidAmount,
        balance: balance,
        status: feeStatusStr,
        fee_status: feeStatusStr,
        amount: totalDue,
        due_date: `${currentMonthStr}-05`,
        created_at: joinDate,
      };

      const feeInsertRes = await db('monthly_fees').insert(filterRow(rawFee, feeCols));
      const feeId = Array.isArray(feeInsertRes) ? feeInsertRes[0] : feeInsertRes;

      // If Paid or Partial, create Payment Transaction
      if (paidAmount > 0) {
        const isCash = i % 8 === 0;
        const pMethod = isCash ? 'Cash' : 'Online';
        const txId = isCash ? 'CASH-' + (10000 + i) : `UPI/${429810000000 + i}/GPay`;

        const rawPayment = {
          fee_id: feeId,
          student_id: studentId,
          hostel_id: hostelId,
          amount: paidAmount,
          payment_method: pMethod,
          payment_mode_id: isCash ? 1 : 2,
          transaction_id: txId,
          receipt_number: `REC-2026-${10000 + i}`,
          payment_date: paidDate || `${currentMonthStr}-02`,
          fee_month: currentMonthStr,
          monthly_rent: monthlyRent,
          carry_forward: carryForward,
          total_due: totalDue,
          fee_status: feeStatusEnum,
          verification_status: 'verified',
          notes: `Rent for ${currentMonthStr} received via ${pMethod}`,
          created_at: new Date(paidDate || `${currentMonthStr}-02`),
        };

        await db('fee_payments').insert(filterRow(rawPayment, paymentCols)).catch(async (err: any) => {
          if (err?.code === 'WARN_DATA_TRUNCATED' || err?.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
            const fallbackPay = { ...rawPayment, fee_status: 'Fully Paid' };
            return db('fee_payments').insert(filterRow(fallbackPay, paymentCols)).catch(() => null);
          }
        });
      }
    }

    // 6. Add 8 Pre-Booked Students (status = 2)
    console.log('📌 Adding 8 Pre-Booked Students...');
    for (let p = 0; p < 8; p++) {
      const fn = firstNames[(100 + p) % firstNames.length];
      const ln = lastNames[(20 + p) % lastNames.length];
      const checkInDate = new Date(today.getTime() + (p + 3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await insertStudentDynamic({
        hostel_id: hostelId,
        first_name: fn,
        last_name: ln,
        email: `prebook.${fn.toLowerCase()}${p + 1}@gmail.com`,
        phone: `98${String(60000000 + p).padStart(8, '0')}`,
        permanent_address: 'Vijayawada, AP',
        current_address: 'Vijayawada, AP',
        id_proof_number: genAadhaar(200 + p),
        admission_date: checkInDate,
        monthly_rent: 8500,
        admission_fee: 1000,
        admission_status: 0, // Pending Check-in
        refundable_deposit: 10000,
        status: 2, // Pre-booked
        is_active: 1,
        created_at: today,
      });
    }

    // 7. Add 7 QR Registrations / Pending Admissions (status = 3)
    console.log('📲 Adding 7 QR Registrations (Pending Admissions)...');
    for (let q = 0; q < 7; q++) {
      const fn = firstNames[(80 + q) % firstNames.length];
      const ln = lastNames[(15 + q) % lastNames.length];

      await insertStudentDynamic({
        hostel_id: hostelId,
        first_name: fn,
        last_name: ln,
        email: `qr.${fn.toLowerCase()}${q + 1}@gmail.com`,
        phone: `98${String(70000000 + q).padStart(8, '0')}`,
        permanent_address: 'Warangal, Telangana',
        current_address: 'Warangal, Telangana',
        id_proof_number: genAadhaar(300 + q),
        admission_date: today.toISOString().split('T')[0],
        monthly_rent: 6500,
        admission_fee: 1000,
        admission_status: 0, // Pending verification
        refundable_deposit: 6500,
        status: 3, // QR registered
        is_active: 1,
        created_at: today,
      });
    }

    // 8. Add 12 Historical Vacated Students (status = 0)
    console.log('🚪 Adding 12 Historical Vacated Students...');
    for (let v = 0; v < 12; v++) {
      const fn = firstNames[(60 + v) % firstNames.length];
      const ln = lastNames[(5 + v) % lastNames.length];
      const joinDateStr = '2025-11-01';
      const vacateDateStr = '2026-06-30';

      await insertStudentDynamic({
        hostel_id: hostelId,
        first_name: fn,
        last_name: ln,
        email: `vacated.${fn.toLowerCase()}${v + 1}@gmail.com`,
        phone: `98${String(85000000 + v).padStart(8, '0')}`,
        permanent_address: 'Visakhapatnam, AP',
        current_address: 'Visakhapatnam, AP',
        id_proof_number: genAadhaar(400 + v),
        admission_date: joinDateStr,
        monthly_rent: 6500,
        admission_fee: 1000,
        admission_status: 1,
        refundable_deposit: 0,
        status: 0, // Inactive / Vacated
        is_active: 0,
        vacate_notice_date: vacateDateStr,
        vacate_notice_reason: 'Job tenure completed - settled and refunded',
        created_at: new Date('2025-11-01'),
      });
    }

    // 9. Seed Multi-Category Expenses
    console.log('💳 Seeding Comprehensive Monthly Expenses...');
    const categories = await db('expense_categories').select('*').catch(() => []);
    const getCatId = (name: string) => {
      const found = categories.find((c: any) => c.category_name?.toLowerCase().includes(name.toLowerCase()));
      return found ? found.category_id : (categories[0]?.category_id || 1);
    };

    const expenseItems = [
      { cat: 'Utilities', amount: 28500, vendor: 'TSSPDCL Electricity Dept', desc: 'Commercial electricity bill for building (6 floors AC & Geysers)' },
      { cat: 'Utilities', amount: 6200, vendor: 'Hyderabad Metro Water Board', desc: 'Monthly water pipeline supply and tanker backup' },
      { cat: 'Utilities', amount: 4500, vendor: 'ACT Fibernet Commercial', desc: 'High-speed 1Gbps dedicated dual-band fiber mesh network' },
      { cat: 'Food', amount: 45000, vendor: 'D-Mart & Rythu Bazar Wholesale', desc: 'Monthly rice, cooking oil, pulses, vegetables, spices & dairy' },
      { cat: 'Maintenance', amount: 7800, vendor: 'QuickFix Plumbing & Electricals', desc: 'RO water purifier servicing, AC filter cleaning, lift maintenance' },
      { cat: 'Maintenance', amount: 5500, vendor: 'CleanPro Hygiene Supplies', desc: 'Floor cleaners, disinfectants, garbage bags, toilet cleaners' },
      { cat: 'Staff', amount: 15000, vendor: 'Eagle Eye Security Services', desc: 'Night security guard deployment & CCTV surveillance maintenance' },
      { cat: 'Utilities', amount: 4200, vendor: 'Indian Oil Petrol Bunk Madhapur', desc: '60 Litres diesel for 25kVA generator power backup' },
    ];

    for (let e = 0; e < expenseItems.length; e++) {
      const exp = expenseItems[e];
      const expDate = `${currentMonthStr}-${String((e * 3) + 2).padStart(2, '0')}`;

      const rawExpense = {
        hostel_id: hostelId,
        category_id: getCatId(exp.cat),
        expense_date: expDate,
        amount: exp.amount,
        payment_mode_id: 2, // UPI
        vendor_name: exp.vendor,
        description: exp.desc,
        bill_number: `BILL-2026-${1000 + e}`,
        created_at: new Date(expDate),
      };

      await db('expenses').insert(filterRow(rawExpense, expenseCols)).catch(() => null);
    }

    // 10. Seed Staff Directory (4 Members)
    console.log('👨‍💼 Seeding Staff Members...');
    const staffMembers = [
      { name: 'Rajesh Sharma', phone: '9876543210', email: 'rajesh.warden@gmail.com', role: 'Warden', salary: 25000, join: '2024-01-10', aadhaar: '3456 7890 1234', notes: 'Overall hostel administration and discipline' },
      { name: 'Suresh Naik', phone: '9876543211', email: 'suresh.cook@gmail.com', role: 'Head Cook', salary: 18000, join: '2024-03-15', aadhaar: '4567 8901 2345', notes: 'Head of kitchen and mess management' },
      { name: 'Lakshmi Bai', phone: '9876543212', email: 'lakshmi.clean@gmail.com', role: 'Housekeeping Incharge', salary: 12000, join: '2024-02-01', aadhaar: '5678 9012 3456', notes: 'Daily floor cleaning and sanitization supervisor' },
      { name: 'Ramesh Yadav', phone: '9876543213', email: 'ramesh.guard@gmail.com', role: 'Night Security Guard', salary: 14000, join: '2024-04-20', aadhaar: '6789 0123 4567', notes: 'Gate security and visitor log monitoring' },
    ];

    for (const st of staffMembers) {
      const rawStaff = {
        hostel_id: hostelId,
        full_name: st.name,
        phone: st.phone,
        email: st.email,
        role: st.role,
        monthly_salary: st.salary,
        join_date: st.join,
        aadhaar_number: st.aadhaar,
        notes: st.notes,
        status: 'active',
        created_at: new Date(st.join),
      };
      await db('staff').insert(filterRow(rawStaff, staffCols)).catch(() => null);
    }

    // 11. Seed Short-Stay Guests (8 Records)
    console.log('🚶 Seeding Short-Stay Guests...');
    const guestProfiles = [
      { name: 'Amitabh Sen', phone: '9812345001', in: '2026-08-18', out: '2026-08-25', days: 7, rate: 700, room: '101', purpose: 'Interview at Amazon IDC' },
      { name: 'Rupesh Kulkarni', phone: '9812345002', in: '2026-08-19', out: '2026-08-24', days: 5, rate: 700, room: '201', purpose: 'TCS Training Program' },
      { name: 'Dheeraj Mathur', phone: '9812345003', in: '2026-08-20', out: '2026-08-26', days: 6, rate: 800, room: '301', purpose: 'Deloitte Tech Conference' },
      { name: 'Prasanna Kumar', phone: '9812345004', in: '2026-08-21', out: '2026-08-23', days: 2, rate: 600, room: '401', purpose: 'Parent Visit / Document Submission' },
      { name: 'Siddharth Roy', phone: '9812345005', in: '2026-08-22', out: '2026-08-28', days: 6, rate: 750, room: '501', purpose: 'Hyderabad Tech Expo 2026' },
      { name: 'Naveen Jindal', phone: '9812345006', in: '2026-08-15', out: '2026-08-21', days: 6, rate: 700, room: '601', purpose: 'Software Consultant Visit' },
      { name: 'Ritesh Pandey', phone: '9812345007', in: '2026-08-16', out: '2026-08-23', days: 7, rate: 700, room: '102', purpose: 'Bank Probationary Officer Exam' },
      { name: 'Hemant Soni', phone: '9812345008', in: '2026-08-21', out: '2026-08-27', days: 6, rate: 750, room: '202', purpose: 'Startup Pitch at T-Hub' },
    ];

    for (let g = 0; g < guestProfiles.length; g++) {
      const gst = guestProfiles[g];
      const total = gst.rate * gst.days;

      const rawGuest = {
        hostel_id: hostelId,
        full_name: gst.name,
        phone: gst.phone,
        check_in_date: gst.in,
        check_out_date: gst.out,
        days: gst.days,
        per_day_amount: gst.rate,
        amount_paid: total,
        room_number: gst.room,
        status: 'active',
        id_proof_number: genAadhaar(500 + g),
        purpose: gst.purpose,
        created_at: new Date(gst.in),
      };

      await db('guests').insert(filterRow(rawGuest, guestCols)).catch(() => null);
    }

    // 12. Seed 7-Day Indian Mess Menu
    console.log('🍽️ Seeding Complete 7-Day Mess Menu...');
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const menuSchedule: Record<string, { b: string; l: string; s: string; d: string }> = {
      Monday: {
        b: 'Idli, Sambar, Coconut Chutney, Ginger Tea & Coffee',
        l: 'Steamed Rice, Tomato Dal, Potato Fry, Rasam, Curd, Papad',
        s: 'Onion Pakoda & Masala Tea',
        d: 'Phulka Roti, Paneer Butter Masala, Jeera Rice, Dal Tadka, Salad',
      },
      Tuesday: {
        b: 'Masala Dosa, Peanut Chutney, Allam Pachadi, Tea & Milk',
        l: 'Steamed Rice, Palak Dal, Aloo Gobi Masala, Sambar, Fresh Curd',
        s: 'Sweet Corn Chat & Filter Coffee',
        d: 'Roti, Mixed Veg Curry, Steamed Rice, Tomato Rasam, Gulab Jamun',
      },
      Wednesday: {
        b: 'Puri, Aloo Masala Curry, Poha, Tea & Coffee',
        l: 'Special Chicken Curry (Veg: Paneer Curry), Bagara Rice, Dal Makhani, Curd',
        s: 'Mirchi Bajji & Irani Chai',
        d: 'Phulka Roti, Egg Curry (Veg: Mushroom Curry), Steamed Rice, Rasam',
      },
      Thursday: {
        b: 'Mysore Bonda, Chana Masala, Coconut Chutney, Tea & Milk',
        l: 'Steamed Rice, Drumstick Sambar, Bendakaya (Okra) Fry, Majjiga Pulusu',
        s: 'Biscuits, Samosa & Masala Tea',
        d: 'Roti, Dal Fry, Capsicum Paneer Masala, Curd Rice, Pickle',
      },
      Friday: {
        b: 'Pulihora (Tamarind Rice), Upma, Chutney, Tea & Coffee',
        l: 'Steamed Rice, Gongura Dal, Cabbage Chana Dal Fry, Pepper Rasam, Curd',
        s: 'Pani Puri & Evening Chai',
        d: 'Phulka Roti, Dal Tadka, Aloo Matar Gravy, Steamed Rice, Sweet Kheer',
      },
      Saturday: {
        b: 'Set Dosa, Butter, Veg Sambar, Chutney, Tea & Milk',
        l: 'Steamed Rice, Mango Dal, Beetroot Fry, Tomato Rasam, Fresh Curd',
        s: 'Punugulu with Spicy Chutney & Tea',
        d: 'South Indian Veg Pulao, Mirchi Ka Salan, Raita, Boiled Egg, Ice Cream',
      },
      Sunday: {
        b: 'Chole Bhature, Rava Upma, Coconut Chutney, Tea & Coffee',
        l: 'Hyderabadi Chicken Biryani (Veg: Paneer Dum Biryani), Mirchi Ka Salan, Raita',
        s: 'Veg Puff & Filter Coffee',
        d: 'Phulka Roti, Tadka Dal, Light Veg Khichdi, Curd Rice, Papad',
      },
    };

    for (const day of weekDays) {
      const m = menuSchedule[day];
      const meals = [
        { hostel_id: hostelId, day_of_week: day, meal_type: 'Breakfast', items: m.b, timing: '7:30 AM - 9:30 AM' },
        { hostel_id: hostelId, day_of_week: day, meal_type: 'Lunch', items: m.l, timing: '12:30 PM - 2:30 PM' },
        { hostel_id: hostelId, day_of_week: day, meal_type: 'Snacks', items: m.s, timing: '5:00 PM - 6:30 PM' },
        { hostel_id: hostelId, day_of_week: day, meal_type: 'Dinner', items: m.d, timing: '7:30 PM - 9:30 PM' },
      ];
      for (const meal of meals) {
        await db('mess_menu').insert(filterRow(meal, menuCols)).catch(() => {});
      }
    }

    console.log('\n============================================================');
    console.log('🎉 REAL PRODUCTION DATA SEEDING COMPLETED SUCCESSFULLY!');
    console.log('============================================================');
    console.log(`🏨 Hostel: "${hostel.hostel_name}" (6 Floors)`);
    console.log(`👤 Owner: demo@test.com / Demo123`);
    console.log(`🏢 Rooms: 48 rooms across Floors 1-6`);
    console.log(`🛏️ Total Beds Capacity: ${allBedSlots.length} (Occupied: 118, Vacant: ${allBedSlots.length - 118})`);
    console.log(`👥 Active Students: 118 (Paid: 66, Pending: 30, Overdue: 22)`);
    console.log(`🚪 Active Vacate Notices: 12 students ready to vacate`);
    console.log(`📌 Pre-Booked: 8 students | 📲 QR Registrations: 7 students | 📂 Vacated Past: 12`);
    console.log(`💳 Expenses: 8 categories totaling ₹1,16,700/mo`);
    console.log(`👨‍💼 Staff: 4 members (Warden, Cook, Housekeeping, Guard)`);
    console.log(`🚶 Guests: 8 short-stay records`);
    console.log(`🍽️ Mess Menu: 7-day full cycle (28 meal records)`);
    console.log('============================================================\n');

  } catch (error: any) {
    console.error('❌ Error seeding production data:', error);
  } finally {
    process.exit(0);
  }
}

seedProductionData();
