import db from '../src/config/database.js';

async function show(table: string) {
  const cols = await db.raw(`SHOW FULL COLUMNS FROM \`${table}\``);
  console.log(`\n--- ${table} ---`);
  for (const c of cols[0]) {
    console.log(`${c.Field}  ${c.Type}  null=${c.Null} default=${c.Default}`);
  }
}

async function main() {
  await show('notices');
  await show('notice_categories');
  await show('users');
  await show('students');
  await show('hostel_master');
  await show('guests');
  await show('fee_payments');

  console.log('\n--- master table contents ---');
  for (const t of ['hostel_type_master', 'guest_status_master', 'verification_status_master', 'transaction_type_master', 'fee_status_master', 'payment_type_master']) {
    const rows = await db(t).select('*');
    console.log(`${t}:`, rows);
  }

  process.exit(0);
}

main().catch(e => { console.error('FAILED:', e); process.exit(1); });
