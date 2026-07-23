import db from '../src/config/database.js';

async function show(table: string) {
  const cols = await db.raw(`SHOW FULL COLUMNS FROM \`${table}\``);
  console.log(`\n--- ${table} ---`);
  for (const c of cols[0]) {
    console.log(`${c.Field}  ${c.Type}  null=${c.Null} default=${c.Default}`);
  }
}

async function main() {
  await show('reminders');
  await show('room_amenities_master');
  await show('amenities_master');
  await show('staff_payments');
  await show('rooms');

  const priorityMaster = await db('priority_master').select('*');
  console.log('\npriority_master:', priorityMaster);
  const payTypeUsage = await db('staff_payments').select('payment_type_id').distinct();
  console.log('staff_payments.payment_type_id distinct:', payTypeUsage);

  process.exit(0);
}

main().catch(e => { console.error('FAILED:', e); process.exit(1); });
