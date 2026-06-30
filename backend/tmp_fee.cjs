const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({
    host: 'mysql-1a300d6c-veeradurgarao840-0853.c.aivencloud.com',
    port: 11120,
    user: 'avnadmin',
    password: 'AVNS_XKhIofBUB4pR5LOtnEg',
    database: 'hostel_management'
  });

  const [students] = await conn.query("SELECT student_id, hostel_id, monthly_rent FROM students WHERE first_name LIKE 'DURGA %'");
  
  const now = new Date();
  const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 15);
  
  const values = students.map(s => [
    s.student_id, 
    s.hostel_id, 
    currentMonth, 
    now.getMonth() + 1, 
    s.monthly_rent, 
    0, 
    s.monthly_rent, 
    0, 
    s.monthly_rent, 
    'Pending', 
    dueDate, 
    'Auto-created bulk', 
    now, 
    now
  ]);

  if (values.length > 0) {
    await conn.query('INSERT IGNORE INTO monthly_fees (student_id, hostel_id, fee_month, fee_date, monthly_rent, carry_forward, total_due, paid_amount, balance, fee_status, due_date, notes, created_at, updated_at) VALUES ?', [values]);
    console.log('Generated fees for ' + values.length + ' students.');
  }

  conn.end();
}
run().catch(console.error);
