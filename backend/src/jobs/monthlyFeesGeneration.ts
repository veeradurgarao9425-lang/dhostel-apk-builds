import cron from 'node-cron';
import db from '../config/database.js';
import { sendNotificationToHostelOwner } from '../utils/notification.js';

/**
 * Cron Job: Automatic Monthly Fees Generation (Student-Based / Anniversary Billing)
 *
 * Schedule: Runs daily at 1:05 AM
 * Pattern: '5 1 * * *'
 *
 * What it does:
 * - Fetches all active hostels
 * - For each hostel, checks active students' admission dates
 * - Determines their next anniversary billing cycle
 * - Generates the bill exactly 3 days BEFORE their anniversary due date
 */

interface Student {
  student_id: number;
  hostel_id: number;
  monthly_rent: number;
  admission_date: Date;
}

// Helper to calculate the next billing cycle and when it should be generated
const calculateNextBillingCycle = (admissionDate: Date, latestFeeMonthStr: string | null) => {
  const admissionDay = admissionDate.getDate();
  let targetYear: number;
  let targetMonth: number; // 0-indexed

  if (!latestFeeMonthStr) {
    // If no previous fee, start with the month of their admission date
    targetYear = admissionDate.getFullYear();
    targetMonth = admissionDate.getMonth();
  } else {
    // Parse latest fee month
    const [y, m] = latestFeeMonthStr.split('-');
    targetYear = parseInt(y);
    targetMonth = parseInt(m); // Already points to the NEXT month (because m is 1-indexed)
  }

  let dueDate = new Date(targetYear, targetMonth, admissionDay);
  if (dueDate.getMonth() !== targetMonth) {
    // Overflow edge case (e.g., Feb 31 -> Mar 3) => Roll back to last day of target month
    dueDate = new Date(targetYear, targetMonth + 1, 0);
  }

  // Generate 3 days before the due date
  let generationDate = new Date(dueDate);
  generationDate.setDate(generationDate.getDate() - 3);

  const targetFeeMonthStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;

  return { feeMonth: targetFeeMonthStr, dueDate, generationDate };
};

const generateMonthlyFeesForHostel = async (hostel_id: number) => {
  try {
    console.log(`[Monthly Fees Cron] Checking fees for hostel ${hostel_id}`);

    // Get all active students with current room allocations
    const students: Student[] = await db('students as s')
      .where('s.hostel_id', hostel_id)
      .where('s.status', 1)
      .whereNotNull('s.room_id')
      .whereNotNull('s.monthly_rent')
      .select('s.student_id', 's.hostel_id', 's.monthly_rent', 's.admission_date');

    if (students.length === 0) {
      console.log(`[Monthly Fees Cron] No active students found for hostel ${hostel_id}`);
      return { skipped: true, reason: 'no_students' };
    }

    const feesData: any[] = [];
    let totalFeesCreated = 0;
    let totalCarryForward = 0;

    // We use a clean "today" date without time components for comparison
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    for (const student of students) {
      try {
        if (!student.admission_date) continue; // Safety check

        // Find the LATEST fee generated for this student
        const latestFee = await db('monthly_fees')
          .where({ student_id: student.student_id })
          .orderBy('fee_month', 'desc')
          .first();

        // Calculate when the next bill should be generated
        const cycle = calculateNextBillingCycle(
          new Date(student.admission_date),
          latestFee ? latestFee.fee_month : null
        );

        const genDateStr = cycle.generationDate.toISOString().split('T')[0];

        // Check if today is the day (or past the day, in case cron failed yesterday) to generate the fee
        if (todayStr >= genDateStr) {
          // Double check it wasn't already generated manually somehow
          const existingFee = await db('monthly_fees')
            .where({ student_id: student.student_id, fee_month: cycle.feeMonth })
            .first();

          if (existingFee) {
            console.log(`[Monthly Fees Cron] Fee ${cycle.feeMonth} already exists for student ${student.student_id}`);
            continue;
          }

          // Calculate carry forward from the latest fee's unpaid balance
          let carryForward = 0;
          if (latestFee) {
            // Unpaid balance of the latest fee
            const balance = parseFloat(latestFee.balance as any) || 0;
            if (balance > 0) {
              carryForward = balance;
              totalCarryForward++;
            }
          }

          const monthlyRent = parseFloat(student.monthly_rent as any) || 0;
          const totalDue = monthlyRent + carryForward;

          // Create the new fee record
          feesData.push({
            student_id: student.student_id,
            hostel_id: student.hostel_id,
            fee_month: cycle.feeMonth,
            fee_date: parseInt(cycle.feeMonth.split('-')[1]),
            monthly_rent: monthlyRent,
            carry_forward: carryForward,
            total_due: totalDue,
            paid_amount: 0,
            balance: totalDue,
            fee_status: totalDue === 0 ? 'Fully Paid' : 'Pending',
            due_date: cycle.dueDate,
            notes: carryForward > 0 ? `Carry forward: ${carryForward}` : 'Auto-generated Anniversary Bill',
            created_at: new Date(),
            updated_at: new Date()
          });

          console.log(`[Monthly Fees Cron] Student ${student.student_id}: Generated fee for ${cycle.feeMonth}, Due: ${cycle.dueDate.toISOString().split('T')[0]}`);
          totalFeesCreated++;
        }
      } catch (err) {
        console.error(`[Monthly Fees Cron] Error processing student ${student.student_id}:`, err);
      }
    }

    // Insert fees inside a transaction for atomicity
    if (feesData.length > 0) {
      const trx = await db.transaction();
      try {
        for (const feeRecord of feesData) {
          await trx('monthly_fees').insert(feeRecord);
        }
        await trx.commit();
      } catch (insertErr) {
        await trx.rollback();
        console.error(`[Monthly Fees Cron] Bulk insert failed for hostel ${hostel_id}, retrying per-student...`, insertErr);
        // Fallback: insert individually, skip duplicates
        for (const feeRecord of feesData) {
          try {
            const exists = await db('monthly_fees')
              .where({ student_id: feeRecord.student_id, fee_month: feeRecord.fee_month })
              .first();
            if (!exists) {
              await db('monthly_fees').insert(feeRecord);
            }
          } catch (singleErr) {
            console.error(`[Monthly Fees Cron] Failed to insert fee for student ${feeRecord.student_id}:`, singleErr);
          }
        }
      }
    }

    console.log(`[Monthly Fees Cron] ✅ Fees generated for hostel ${hostel_id}:`, {
      students_checked: students.length,
      fees_created: totalFeesCreated,
      with_carry_forward: totalCarryForward
    });

    // Send a summary notification to the hostel owner
    const totalDueSum = feesData.reduce((sum, f) => sum + (f.total_due || 0), 0);
    if (totalFeesCreated > 0) {
      sendNotificationToHostelOwner(
        hostel_id,
        'Payment Due',
        'Monthly Fees Generated',
        `Anniversary fees generated for ${totalFeesCreated} students today. Total due: ₹${totalDueSum}.`,
        'High'
      ).catch(err => console.error('Failed to send monthly fee generation notification:', err));
    }

    return {
      success: true,
      students_count: students.length,
      fees_created: totalFeesCreated,
      carry_forward_count: totalCarryForward,
      total_records: feesData.length
    };
  } catch (error) {
    console.error(`[Monthly Fees Cron] Error generating fees for hostel ${hostel_id}:`, error);
    return { error: true, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const startMonthlyFeesGenerationJob = () => {
  // Production runs daily at 1:05 AM. Dev runs every hour.
  const cronPattern = process.env.NODE_ENV === 'production' ? '5 1 * * *' : '5 * * * *';
  
  const job = cron.schedule(cronPattern, async () => {
    console.log('===========================================');
    console.log('[Monthly Fees Cron] Daily Anniversary Check Started');
    console.log('[Monthly Fees Cron] Time:', new Date().toISOString());
    console.log('[Monthly Fees Cron] Environment:', process.env.NODE_ENV || 'development');
    console.log('===========================================');

    try {
      const hostels = await db('hostel_master')
        .where('is_active', 1)
        .select('hostel_id', 'hostel_name');

      console.log(`[Monthly Fees Cron] Found ${hostels.length} active hostels`);

      const results = [];

      for (const hostel of hostels) {
        const result = await generateMonthlyFeesForHostel(hostel.hostel_id);
        results.push({
          hostel_id: hostel.hostel_id,
          hostel_name: hostel.hostel_name,
          ...result
        });
      }

      const successful = results.filter(r => r.success).length;
      const skipped = results.filter(r => r.skipped).length;
      const failed = results.filter(r => r.error).length;

      console.log('===========================================');
      console.log('[Monthly Fees Cron] Daily Generation Completed');
      console.log(`[Monthly Fees Cron] Success: ${successful} | Skipped: ${skipped} | Failed: ${failed}`);
      console.log('===========================================');

    } catch (error) {
      console.error('[Monthly Fees Cron] Fatal error:', error);
    }
  });

  const mode = process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT';
  const schedule = process.env.NODE_ENV === 'production' ? 'Daily (1:05 AM)' : 'Hourly';
  console.log(`✅ Daily Anniversary fees cron job scheduled (${mode} MODE: ${schedule})`);

  return job;
};

// Manual trigger function for testing
export const triggerManualMonthlyFeesGeneration = async () => {
  console.log('[Manual Trigger - Monthly Fees] Starting daily fees check...');

  const hostels = await db('hostel_master')
    .where('is_active', 1)
    .select('hostel_id', 'hostel_name');

  const results = [];
  for (const hostel of hostels) {
    const result = await generateMonthlyFeesForHostel(hostel.hostel_id);
    results.push({
      hostel_id: hostel.hostel_id,
      hostel_name: hostel.hostel_name,
      ...result
    });
  }

  return results;
};
