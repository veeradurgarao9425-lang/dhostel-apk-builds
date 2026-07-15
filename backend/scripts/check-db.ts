import db from './config/database.js';

async function main() {
  try {
    const students = await db('students')
      .select('student_id', 'first_name', 'last_name', 'vacate_notice_date', 'hostel_id', 'status');
    console.log('--- ALL STUDENTS IN DATABASE ---');
    console.log(JSON.stringify(students, null, 2));
    
    const countNonNull = await db('students')
      .whereNotNull('vacate_notice_date')
      .count('* as count')
      .first();
    console.log('--- countNonNull ---', countNonNull);

    const countWithHostel = await db('students')
      .whereNotNull('vacate_notice_date')
      .whereIn('hostel_id', [1])
      .count('* as count')
      .first();
    console.log('--- countWithHostel (hostel 1) ---', countWithHostel);
  } catch (e) {
    console.error('Error querying database:', e);
  } finally {
    process.exit(0);
  }
}

main();
