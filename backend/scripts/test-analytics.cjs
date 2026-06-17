const knex = require('knex');

const db = knex({
  client: 'mysql2',
  connection: {
    host: 'mysql-1a300d6c-veeradurgarao840-0853.c.aivencloud.com',
    port: 11120,
    user: 'avnadmin',
    password: 'AVNS_XKhIofBUB4pR5LOtnEg',
    database: 'hostel_management',
    ssl: {
      rejectUnauthorized: false
    }
  }
});

async function main() {
  const dateStr = '2026-06-16';
  const type = 'month';
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  let startDate, endDate;
  if (type === 'day') {
    startDate = `${dateStr} 00:00:00`;
    endDate = `${dateStr} 23:59:59`;
  } else if (type === 'week') {
    endDate = `${dateStr} 23:59:59`;
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - 6);
    const dy = d.getFullYear();
    const dm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    startDate = `${dy}-${dm}-${dd} 00:00:00`;
  } else {
    startDate = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
    const lastDay = new Date(year, month, 0).getDate();
    endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')} 23:59:59`;
  }

  console.log('startDate:', startDate);
  console.log('endDate:', endDate);

  // 1. Fetch Income records
  let incomeQuery = db('income as i')
    .leftJoin('payment_modes as pm', 'i.payment_mode_id', 'pm.payment_mode_id')
    .whereBetween('i.income_date', [startDate, endDate]);

  const incomes = await incomeQuery.select(
    'i.*',
    'pm.payment_mode_name as payment_mode'
  );
  console.log('Incomes count:', incomes.length, incomes);

  // 2. Fetch Fee Payment records
  let feeQuery = db('fee_payments as fp')
    .leftJoin('students as s', 'fp.student_id', 's.student_id')
    .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
    .whereBetween('fp.payment_date', [startDate, endDate]);

  const feePayments = await feeQuery.select(
    'fp.*',
    's.first_name',
    's.last_name',
    'pm.payment_mode_name as payment_mode'
  );
  console.log('Fee payments count:', feePayments.length, feePayments);

  await db.destroy();
}

main().catch(console.error);
